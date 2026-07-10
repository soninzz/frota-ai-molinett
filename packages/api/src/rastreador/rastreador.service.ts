import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../database/prisma.service'
import { PosicaoVeiculo } from './dto/posicao-veiculo.dto'

interface AssemilsatPosicao {
  idveiculo: string
  placa: string
  latitude: string
  longitude: string
  velocidade: string
  ignicao: string
  data_gps: string
}

interface AssemilsatPosicoesResponse {
  success: boolean
  erro?: string
  quantidade?: number
  restantes?: number
  posicoes?: AssemilsatPosicao[]
}

@Injectable()
export class RastreadorService {
  private readonly logger = new Logger(RastreadorService.name)
  private readonly modo: string
 
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.modo = this.config.get<string>('TRACKER_MODE', 'mock')
  }
 
  // ── Ponto único de entrada — troca sozinho entre mock e real ──
  async buscarPosicoesNovas(): Promise<PosicaoVeiculo[]> {
    if (this.modo === 'live') {
      return this.buscarPosicoesReais()
    }
    return this.buscarPosicoesMock()
  }
 
  // ── MODO MOCK — usado até a autenticação real ser validada ──
  private async buscarPosicoesMock(): Promise<PosicaoVeiculo[]> {
    this.logger.debug('TRACKER_MODE=mock — retornando posições simuladas')
 
    const veiculos = await this.prisma.veiculo.findMany({ where: { ativo: true } })
 
    return veiculos.map((v) => ({
      veiculoIdExterno: v.id,
      placa: v.placa,
      latitude: -27.1 + Math.random() * 0.5,
      longitude: -52.5 + Math.random() * 0.5,
      velocidade: Math.random() > 0.3 ? Math.round(Math.random() * 90) : 0,
      motorLigado: Math.random() > 0.2,
      timestamp: new Date(),
    }))
  }
 
  // ── MODO LIVE — chamada real à API do Assemilsat ──
  // Auth confirmada em 2026-07-10 contra a API real: POST com usuario/senha
  // no corpo (form-urlencoded), NÃO é Basic Auth. Endpoint retorna só as
  // posições ainda não baixadas (janela de 48h); cada chamada avança o
  // cursor do lado do Assemilsat — não é idempotente.
  private async buscarPosicoesReais(): Promise<PosicaoVeiculo[]> {
    const baseUrl = this.config.get<string>('ASSEMILSAT_API_URL')
    const login = this.config.get<string>('ASSEMILSAT_API_LOGIN')
    const senha = this.config.get<string>('ASSEMILSAT_API_SENHA')

    try {
      const response = await fetch(`${baseUrl}/integracao/posicoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ usuario: login ?? '', senha: senha ?? '' }),
      })

      if (!response.ok) {
        this.logger.error(`Assemilsat API retornou ${response.status}`)
        await this.prisma.integracaoLog.create({
          data: {
            fonte: 'rastreador',
            status: 'ERRO',
            detalhes: `HTTP ${response.status}`,
            erro: await response.text(),
          },
        })
        return []
      }

      const dados = (await response.json()) as AssemilsatPosicoesResponse

      if (!dados.success) {
        this.logger.error(`Assemilsat API retornou erro: ${dados.erro}`)
        await this.prisma.integracaoLog.create({
          data: { fonte: 'rastreador', status: 'ERRO', erro: dados.erro },
        })
        return []
      }

      await this.prisma.integracaoLog.create({
        data: {
          fonte: 'rastreador',
          status: 'OK',
          detalhes: `${dados.quantidade} posições recebidas, ${dados.restantes} restantes`,
        },
      })

      return (dados.posicoes ?? []).map((d) => ({
        veiculoIdExterno: d.idveiculo,
        placa: d.placa,
        latitude: parseFloat(d.latitude),
        longitude: parseFloat(d.longitude),
        velocidade: parseFloat(d.velocidade) || 0,
        motorLigado: d.ignicao === 'L',
        timestamp: new Date(d.data_gps.replace(' ', 'T')),
      }))
    } catch (e) {
      this.logger.error('Falha ao conectar com Assemilsat', e)
      await this.prisma.integracaoLog.create({
        data: { fonte: 'rastreador', status: 'ERRO', erro: (e as Error).message },
      })
      return []
    }
  }
 
  // Abaixo da qual consideramos o veículo "parado" mesmo com motor ligado
  // (tráfego, semáforo). Acima disso conta como direção efetiva.
  private static readonly VELOCIDADE_PARADO_KMH = 5

  // ── Atualiza HT/HP da viagem em andamento com base nas posições ──
  // Chamado por um cron (ex: a cada 5 min) para todas as viagens EM_ANDAMENTO.
  // Também persiste a telemetria bruta (necessária pra checar direção
  // contínua de 5h30 e intervalo intrajornada de 1h — Lei do Motorista).
  async atualizarViagensEmAndamento() {
    const posicoes = await this.buscarPosicoesNovas()
    if (!posicoes.length) return

    const viagensAtivas = await this.prisma.viagem.findMany({
      where: { concluidaEm: null, iniciadaEm: { not: null } },
      include: { veiculo: true },
    })

    for (const viagem of viagensAtivas) {
      const posicoesDoVeiculo = posicoes.filter((p) => p.placa === viagem.veiculo.placa)
      if (!posicoesDoVeiculo.length) continue

      // Motor ligado + em movimento = direção efetiva (HT).
      // Motor ligado + parado = tempo de espera (HP motor ligado — CLT 235-C §§8/9,
      // conta como jornada). Motor desligado = HP motor desligado.
      let minutosDirecao = 0
      let minutosEspera = 0
      let minutosParado = 0
      for (const p of posicoesDoVeiculo) {
        if (p.motorLigado && p.velocidade > RastreadorService.VELOCIDADE_PARADO_KMH) minutosDirecao += 5
        else if (p.motorLigado) minutosEspera += 5
        else minutosParado += 5
      }

      await this.prisma.$transaction([
        this.prisma.viagem.update({
          where: { id: viagem.id },
          data: {
            htMinutos: (viagem.htMinutos ?? 0) + minutosDirecao,
            hpMotorLigado: (viagem.hpMotorLigado ?? 0) + minutosEspera,
            hpMotorDesligado: (viagem.hpMotorDesligado ?? 0) + minutosParado,
          },
        }),
        this.prisma.telemetriaPosicao.createMany({
          data: posicoesDoVeiculo.map((p) => ({
            viagemId: viagem.id,
            veiculoId: viagem.veiculoId,
            latitude: p.latitude,
            longitude: p.longitude,
            velocidade: p.velocidade,
            motorLigado: p.motorLigado,
            timestamp: p.timestamp,
          })),
        }),
      ])
    }
  }
}
 