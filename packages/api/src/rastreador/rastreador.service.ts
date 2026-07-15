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

interface MegasatLoginResponse {
  success: boolean
  token?: string
  data?: { id: number; variables?: Record<string, unknown> }
}

interface MegasatTracker {
  licensePlate: string
  latitude: string
  longitude: string
  speed: number
  ign: boolean
  date: string
}

interface MegasatGridResponse {
  success: boolean
  data?: { data: MegasatTracker[] }
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
  // Em live, combina Assemilsat + MegaSat/STC (frotas parcialmente sobrepostas,
  // cada rastreador cobre um subconjunto de veículos) — dedup por placa,
  // mantendo a posição mais recente entre as duas fontes.
  async buscarPosicoesNovas(): Promise<PosicaoVeiculo[]> {
    if (this.modo !== 'live') return this.buscarPosicoesMock()

    const [assemilsat, megasat] = await Promise.all([
      this.buscarPosicoesReais(),
      this.buscarPosicoesMegasat(),
    ])

    const porPlaca = new Map<string, PosicaoVeiculo>()
    for (const p of [...assemilsat, ...megasat]) {
      const atual = porPlaca.get(p.placa)
      if (!atual || p.timestamp > atual.timestamp) porPlaca.set(p.placa, p)
    }
    return [...porPlaca.values()]
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
 
  // ── MODO LIVE — chamada real ao MegaSat/STC ──
  // Auth confirmada em 2026-07-14 via engenharia reversa da SPA (portal não
  // documentado): POST /integration/prod/sys/api/user/login com
  // {key, user, pass} devolve um JWT; o grid de veículos exige esse token
  // via header Authorization. "key" é o slug do cliente na URL do portal
  // (não é a "chave de acesso" MSR informada — essa não é usada aqui).
  private async buscarPosicoesMegasat(): Promise<PosicaoVeiculo[]> {
    const baseUrl = this.config.get<string>('MEGASAT_API_URL')
    const key = this.config.get<string>('MEGASAT_KEY')
    const usuario = this.config.get<string>('MEGASAT_LOGIN')
    const senha = this.config.get<string>('MEGASAT_SENHA')

    try {
      const loginResp = await fetch(`${baseUrl}/integration/prod/sys/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, user: usuario, pass: senha, locale: 'pt', variables: {} }),
      })
      const loginDados = (await loginResp.json()) as MegasatLoginResponse
      if (!loginResp.ok || !loginDados.success || !loginDados.token) {
        this.logger.error('MegaSat: falha no login')
        await this.prisma.integracaoLog.create({
          data: { fonte: 'rastreador_megasat', status: 'ERRO', erro: 'Falha no login' },
        })
        return []
      }

      const gridResp = await fetch(`${baseUrl}/integration/prod/sys/grid/loadGridTracker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginDados.token}`,
        },
        body: JSON.stringify({
          userId: loginDados.data?.id,
          search: null,
          sort: {},
          perPage: 100,
          page: 1,
          fields: [],
          locale: 'pt',
          key,
          // servidor exige as mesmas "variables" de configuração devolvidas no
          // login (ex: hourmeter) — sem isso quebra com "Undefined index"
          variables: loginDados.data?.variables ?? {},
        }),
      })
      const gridDados = (await gridResp.json()) as MegasatGridResponse
      if (!gridResp.ok || !gridDados.success) {
        this.logger.error('MegaSat: falha ao buscar posições')
        await this.prisma.integracaoLog.create({
          data: { fonte: 'rastreador_megasat', status: 'ERRO', erro: 'Falha no grid de trackers' },
        })
        return []
      }

      const trackers = gridDados.data?.data ?? []
      await this.prisma.integracaoLog.create({
        data: { fonte: 'rastreador_megasat', status: 'OK', detalhes: `${trackers.length} veículos recebidos` },
      })

      return trackers.map((t) => ({
        veiculoIdExterno: t.licensePlate,
        // MegaSat devolve sem hífen (ex: AAW8J03) — banco usa formato Mercosul
        // com hífen (AAW-8J03), igual ao Assemilsat. Normaliza pra casar.
        placa: /^[A-Z]{3}\d/.test(t.licensePlate) ? t.licensePlate.replace(/^([A-Z]{3})/, '$1-') : t.licensePlate,
        latitude: parseFloat(t.latitude),
        longitude: parseFloat(t.longitude),
        velocidade: t.speed || 0,
        motorLigado: t.ign,
        timestamp: new Date(t.date.replace(' ', 'T')),
      }))
    } catch (e) {
      this.logger.error('Falha ao conectar com MegaSat/STC', e)
      await this.prisma.integracaoLog.create({
        data: { fonte: 'rastreador_megasat', status: 'ERRO', erro: (e as Error).message },
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
 