import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CategoriaAlerta } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { PosicaoVeiculo } from './dto/posicao-veiculo.dto'
import { fetchComRetry } from '../common/fetch-retry.util'
import { AlertasService } from '../alertas/alertas.service'

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

// API REST oficial da STC (Swagger público em
// ap3.stc.srv.br/integration/prod/swagger#/, achado em 2026-07-18 — a doc em
// ap2.stc.srv.br/docs/ citada no PDF do cliente dá 404, mas essa aqui é real
// e funciona). Endpoint /ws/getBasicClientVehicles: requer key/user/pass,
// devolve posição mais recente por veículo já com lat/lon/ignição/velocidade
// — mais completo que o método reverso abaixo e não depende de engenharia
// reversa de SPA. Senha funciona em texto puro (testado ao vivo), apesar do
// PDF mencionar MD5 — provavelmente essa exigência é de outro fluxo (Admin).
interface StcWsVehicleItem {
  plate: string
  date: string
  ignition: string // "ON" | "OFF"
  speed: string // numérico em string
  latitude: string
  longitude: string
}

interface StcWsResponse {
  success: boolean
  error: number
  msg?: string | null
  data?: StcWsVehicleItem[]
}

@Injectable()
export class RastreadorService {
  private readonly logger = new Logger(RastreadorService.name)
  private readonly modo: string
 
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private alertas: AlertasService,
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
      fonte: 'assemilsat' as const,
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
        fonte: 'assemilsat' as const,
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
  // Tenta a API REST oficial primeiro (mais estável, documentada); cai pro
  // método reverso (SPA) só se a oficial falhar — mantém o que já
  // funcionava em produção como rede de segurança durante a transição.
  private async buscarPosicoesMegasat(): Promise<PosicaoVeiculo[]> {
    const oficial = await this.buscarPosicoesStcOficial()
    if (oficial.length > 0) return oficial
    return this.buscarPosicoesMegasatReverso()
  }

  // ── STC — API REST oficial (POST /ws/getBasicClientVehicles) ──
  private async buscarPosicoesStcOficial(): Promise<PosicaoVeiculo[]> {
    const baseUrl = this.config.get<string>('MEGASAT_API_URL') ?? 'http://ap3.stc.srv.br'
    const key = this.config.get<string>('STC_CHAVE_INTEGRACAO')
    const user = this.config.get<string>('STC_USUARIO')
    const pass = this.config.get<string>('STC_SENHA')
    if (!key || !user || !pass) return []

    try {
      const resp = await fetchComRetry(`${baseUrl}/integration/prod/ws/getBasicClientVehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, user, pass, page: 1 }),
      })
      const dados = (await resp.json()) as StcWsResponse
      if (!resp.ok || !dados.success) {
        this.logger.warn(`STC oficial: falha (${dados.msg ?? 'sem detalhe'}) — caindo pro método reverso`)
        return []
      }

      const veiculos = dados.data ?? []
      await this.prisma.integracaoLog.create({
        data: { fonte: 'rastreador_megasat', status: 'OK', detalhes: `${veiculos.length} veículos recebidos (API oficial)` },
      })

      return veiculos.map((v) => ({
        veiculoIdExterno: v.plate,
        placa: /^[A-Z]{3}\d/.test(v.plate) ? v.plate.replace(/^([A-Z]{3})/, '$1-') : v.plate,
        latitude: parseFloat(v.latitude),
        longitude: parseFloat(v.longitude),
        velocidade: parseFloat(v.speed) || 0,
        motorLigado: v.ignition === 'ON',
        timestamp: new Date(v.date.replace(' ', 'T')),
        fonte: 'megasat' as const,
      }))
    } catch (e) {
      this.logger.warn('STC oficial: erro de conexão, caindo pro método reverso', e)
      return []
    }
  }

  // ── MegaSat/STC — método reverso (fallback) ──
  // Auth confirmada em 2026-07-14 via engenharia reversa da SPA (portal não
  // documentado): POST /integration/prod/sys/api/user/login com
  // {key, user, pass} devolve um JWT; o grid de veículos exige esse token
  // via header Authorization. "key" é o slug do cliente na URL do portal
  // (não é a "chave de acesso" MSR informada — essa não é usada aqui).
  private async buscarPosicoesMegasatReverso(): Promise<PosicaoVeiculo[]> {
    const baseUrl = this.config.get<string>('MEGASAT_API_URL')
    const key = this.config.get<string>('MEGASAT_KEY')
    const usuario = this.config.get<string>('MEGASAT_LOGIN')
    const senha = this.config.get<string>('MEGASAT_SENHA')

    try {
      const loginResp = await fetchComRetry(`${baseUrl}/integration/prod/sys/api/user/login`, {
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

      const gridResp = await fetchComRetry(`${baseUrl}/integration/prod/sys/grid/loadGridTracker`, {
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
        fonte: 'megasat' as const,
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
  private static readonly MAX_TENTATIVAS = 5
  private static readonly LOTE_PROCESSAMENTO = 500

  // ── Ponto único chamado pelo cron a cada 5 min ──
  // Duas fases separadas de propósito (idempotência real, sem Redis/BullMQ):
  // (1) busca e persiste as posições cruas na fila `PosicaoRastreadorRecebida`
  // imediatamente — o Assemilsat não é idempotente (cada chamada consome a
  // fila do lado deles), então essa é a ÚNICA chance de não perder o dado se
  // o processamento falhar depois; (2) processa a fila (linhas PENDENTE/ERRO
  // com tentativas < máximo), uma posição por vez dentro de uma transação —
  // se cair no meio, a linha nunca é marcada PROCESSADO e volta pro próximo
  // ciclo sem contar HT/HP nem gravar telemetria em duplicidade.
  async sincronizarPosicoes() {
    await this.receberPosicoes()
    await this.processarPosicoesPendentes()
  }

  private async receberPosicoes() {
    const posicoes = await this.buscarPosicoesNovas()
    if (!posicoes.length) return

    await this.prisma.posicaoRastreadorRecebida.createMany({
      data: posicoes.map((p) => ({
        fonte: p.fonte,
        veiculoIdExterno: p.veiculoIdExterno,
        placa: p.placa,
        latitude: p.latitude,
        longitude: p.longitude,
        velocidade: p.velocidade,
        motorLigado: p.motorLigado,
        timestamp: p.timestamp,
      })),
    })
  }

  private async processarPosicoesPendentes() {
    const pendentes = await this.prisma.posicaoRastreadorRecebida.findMany({
      where: {
        OR: [
          { status: 'PENDENTE' },
          { status: 'ERRO', tentativas: { lt: RastreadorService.MAX_TENTATIVAS } },
        ],
      },
      orderBy: { recebidoEm: 'asc' },
      take: RastreadorService.LOTE_PROCESSAMENTO,
    })
    if (!pendentes.length) return

    let sucesso = 0
    let falhas = 0
    for (const row of pendentes) {
      try {
        await this.processarUmaPosicao(row)
        sucesso++
      } catch (e) {
        falhas++
        await this.marcarFalha(row, e as Error)
      }
    }
    this.logger.log(`Fila do rastreador: ${sucesso} posição(ões) processada(s), ${falhas} falha(s)`)
  }

  // Processa UMA posição por transação — atomicidade entre atualizar
  // veículo/viagem/telemetria e marcar a linha PROCESSADO é o que garante
  // "processa exatamente uma vez, mesmo com retry".
  private async processarUmaPosicao(row: {
    id: string
    placa: string
    latitude: number
    longitude: number
    velocidade: number
    motorLigado: boolean
    timestamp: Date
    fonte: string
  }) {
    await this.prisma.$transaction(async (tx) => {
      const veiculo = await tx.veiculo.findFirst({ where: { placa: row.placa } })
      if (veiculo) {
        await tx.veiculo.update({
          where: { id: veiculo.id },
          data: {
            ultimaLatitude: row.latitude,
            ultimaLongitude: row.longitude,
            ultimaVelocidade: row.velocidade,
            ultimoMotorLigado: row.motorLigado,
            ultimaPosicaoEm: row.timestamp,
            ultimaPosicaoFonte: row.fonte,
          },
        })

        const viagemAtiva = await tx.viagem.findFirst({
          where: { veiculoId: veiculo.id, concluidaEm: null, iniciadaEm: { not: null } },
        })
        if (viagemAtiva) {
          // Motor ligado + em movimento = direção efetiva (HT).
          // Motor ligado + parado = tempo de espera (HP motor ligado — CLT 235-C
          // §§8/9, conta como jornada). Motor desligado = HP motor desligado.
          const emMovimento = row.motorLigado && row.velocidade > RastreadorService.VELOCIDADE_PARADO_KMH
          const emEspera = row.motorLigado && !emMovimento

          await tx.viagem.update({
            where: { id: viagemAtiva.id },
            data: {
              htMinutos: { increment: emMovimento ? 5 : 0 },
              hpMotorLigado: { increment: emEspera ? 5 : 0 },
              hpMotorDesligado: { increment: !row.motorLigado ? 5 : 0 },
            },
          })
          await tx.telemetriaPosicao.create({
            data: {
              viagemId: viagemAtiva.id,
              veiculoId: veiculo.id,
              latitude: row.latitude,
              longitude: row.longitude,
              velocidade: row.velocidade,
              motorLigado: row.motorLigado,
              timestamp: row.timestamp,
            },
          })
        }
      }

      await tx.posicaoRastreadorRecebida.update({
        where: { id: row.id },
        data: { status: 'PROCESSADO', processadoEm: new Date() },
      })
    })
  }

  // DLQ: depois de MAX_TENTATIVAS falhas, a linha para de ser retentada
  // automaticamente e vira FALHA_PERMANENTE — alerta o Gestor Principal em
  // vez de ficar tentando pra sempre (ou some silenciosamente do sistema).
  private async marcarFalha(row: { id: string; tentativas: number; placa: string }, erro: Error) {
    const tentativas = row.tentativas + 1
    const dlq = tentativas >= RastreadorService.MAX_TENTATIVAS
    await this.prisma.posicaoRastreadorRecebida.update({
      where: { id: row.id },
      data: {
        tentativas,
        status: dlq ? 'FALHA_PERMANENTE' : 'ERRO',
        erro: erro.message,
      },
    })
    this.logger.error(`Falha ao processar posição de ${row.placa} (tentativa ${tentativas})`, erro)

    if (dlq) {
      await this.garantirRegraDlq()
      await this.alertas.disparar({
        categoria: CategoriaAlerta.OPERACIONAL,
        evento: 'RASTREADOR_POSICAO_DLQ',
        mensagem: `Posição do veículo ${row.placa} falhou ${tentativas}x ao processar e foi pra fila morta (DLQ) — requer checagem manual.`,
        contexto: { placa: row.placa, posicaoId: row.id, erro: erro.message },
      })
    }
  }

  private async garantirRegraDlq() {
    const existente = await this.prisma.regraAlerta.findFirst({ where: { evento: 'RASTREADOR_POSICAO_DLQ' } })
    if (!existente) {
      await this.prisma.regraAlerta.create({
        data: {
          categoria: CategoriaAlerta.OPERACIONAL,
          evento: 'RASTREADOR_POSICAO_DLQ',
          descricao: 'Posição do rastreador falhou repetidamente ao processar (fila morta)',
          destinatariosPerfis: ['GESTOR_PRINCIPAL'],
          canal: 'PAINEL',
        },
      })
    }
  }
}
 