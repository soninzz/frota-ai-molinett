import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CriarCotacaoDto } from './dto/criar-cotacao.dto'
import { ConfirmarCotacaoDto } from './dto/confirmar-cotacao.dto'
import { AlterarOsDto } from './dto/alterar-os.dto'
import { AprovarCotacaoDto } from './dto/aprovar-cotacao.dto'
import { CotacaoSaldoService } from './cotacao-saldo.service'
import { CotacaoMetasService } from './cotacao-metas.service'
import { CotacaoTabelaService } from './cotacao-tabela.service'
import { AlertasService } from '../alertas/alertas.service'

const MARGENS_PERMITIDAS = [0, 5, 10, 15, 20]

@Injectable()
export class CotacaoService {
  constructor(
    private prisma: PrismaService,
    private saldoService: CotacaoSaldoService,
    private metasService: CotacaoMetasService,
    private tabelaService: CotacaoTabelaService,
    private alertasService: AlertasService,
  ) {}

  // ── Calcula os 5 cenários de margem ──────────────────────
  async calcular(dto: CriarCotacaoDto, usuarioId: string) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id: dto.veiculoId },
    })
    if (!veiculo) throw new NotFoundException('Veículo não encontrado')

    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
    })
    if (!cliente) throw new NotFoundException('Cliente não encontrado')

    // Custo/km do veículo (vindo do S03 — por enquanto usa valor do banco)
    const custoKm = veiculo.custoKmAtual ?? 4.5 // fallback mock até S03 estar pronto
    const kmEstimado = dto.kmEstimado ?? 100
    const custoBase = custoKm * kmEstimado

    // Calcula 5 cenários
    const cenarios = MARGENS_PERMITIDAS.map(margem => ({
      margem,
      valorFinal: parseFloat((custoBase * (1 + margem / 100)).toFixed(2)),
      lucro: parseFloat((custoBase * (margem / 100)).toFixed(2)),
      precoKm: parseFloat((custoBase * (1 + margem / 100) / kmEstimado).toFixed(2)),
    }))

    // Saldo a recuperar e margem sugerida
    const saldoAtual = await this.saldoService.getSaldo()
    const margemSugerida = this.saldoService.calcularMargemSugerida(10, saldoAtual, custoBase)

    // Tabela mínima do cliente
    const tabela = await this.tabelaService.getTabelaMinima(dto.clienteId)

    // Salva cotação em aberto
    const cotacao = await this.prisma.cotacao.create({
      data: {
        clienteId:       dto.clienteId,
        veiculoId:       dto.veiculoId,
        motoristaId:     dto.motoristaId,
        criadoPorId:     usuarioId,
        origem:          dto.origem,
        destino:         dto.destino,
        kmEstimado,
        tipoServico:     dto.tipoServico,
        custoKmSnapshot: custoKm,
        custoTotalBase:  custoBase,
        margemPct:       0,    // será atualizado ao confirmar
        valorFinal:      custoBase, // será atualizado ao confirmar
        status:          'ABERTA',
      },
    })

    return {
      cotacaoId:     cotacao.id,
      veiculo:       { placa: veiculo.placa, modelo: veiculo.modelo },
      cliente:       { nome: cliente.nome },
      rota:          { origem: dto.origem, destino: dto.destino, kmEstimado },
      custoKm,
      custoBase,
      cenarios,
      saldoARecuperar: saldoAtual,
      margemSugerida,
      tabelaMinima:  tabela ? { valorSaida: tabela.valorSaida, mediaKm: tabela.mediaKmTotal } : null,
    }
  }

  // ── Confirma cotação e gera OS ────────────────────────────
  // opcoes.forcarAprovacao = true → usado pelo fluxo de aprovação do gestor,
  // pula o bloqueio de margem negativa (a cotação já está com status
  // PENDENTE_APROVACAO e o gestor está autorizando explicitamente).
  async confirmar(
    dto: ConfirmarCotacaoDto,
    usuarioId: string,
    opcoes?: { forcarAprovacao?: boolean },
  ) {
    const cotacao = await this.prisma.cotacao.findUnique({
      where: { id: dto.cotacaoId },
      include: { veiculo: true, cliente: true },
    })
    if (!cotacao) throw new NotFoundException('Cotação não encontrada')

    const statusValido = opcoes?.forcarAprovacao
      ? cotacao.status === 'PENDENTE_APROVACAO'
      : cotacao.status === 'ABERTA'

    if (!statusValido) {
      throw new BadRequestException(
        opcoes?.forcarAprovacao
          ? 'Esta cotação não está pendente de aprovação'
          : 'Cotação não está aberta',
      )
    }

    // ── GUARDRAIL 1: Margem negativa = bloqueio total ─────
    // Sem forçar aprovação: em vez de rejeitar e perder o registro,
    // salva a cotação como PENDENTE_APROVACAO com a margem pretendida.
    // O gestor decide depois pela rota de aprovação.
    if (dto.margemPct < 0 && !opcoes?.forcarAprovacao) {
      const valorPretendido = parseFloat(
        (cotacao.custoTotalBase * (1 + dto.margemPct / 100)).toFixed(2),
      )

      await this.prisma.cotacao.update({
        where: { id: dto.cotacaoId },
        data: {
          margemPct: dto.margemPct,
          valorFinal: valorPretendido,
          deficitRegistrado: dto.deficitRegistrado,
          justificativaDeficit: dto.justificativaDeficit,
          status: 'PENDENTE_APROVACAO',
        },
      })

      // Dispara alerta para o gestor — hoje aparece no painel /alertas,
      // amanhã (com WhatsApp) também vira mensagem de verdade.
      await this.alertasService.disparar({
        categoria: 'COMERCIAL',
        evento: 'COTACAO_PENDENTE_APROVACAO',
        mensagem: `Cotação #${cotacao.numero} (${cotacao.origem} → ${cotacao.destino}) aguardando aprovação — margem ${dto.margemPct}%, valor R$ ${valorPretendido.toFixed(2)}`,
        contexto: { cotacaoId: cotacao.id, margemPct: dto.margemPct, valorPretendido },
      })

      throw new ForbiddenException(
        'Margem negativa não permitida sem aprovação do gestor. A cotação foi salva como pendente de aprovação.',
      )
    }

    const valorFinal = parseFloat(
      (cotacao.custoTotalBase * (1 + dto.margemPct / 100)).toFixed(2),
    )

    // Valida contra metas dinâmicas
    const validacaoMetas = await this.metasService.validarContraMetas(
      valorFinal,
      cotacao.kmEstimado ?? 0,
    )

    // Registra deficit se fechou abaixo do ideal (10%)
    if (dto.margemPct < 10 && dto.deficitRegistrado) {
      await this.saldoService.adicionarDeficit(dto.deficitRegistrado)
    }

    // Atualiza cotação
    await this.prisma.cotacao.update({
      where: { id: dto.cotacaoId },
      data: {
        margemPct:           dto.margemPct,
        valorFinal,
        deficitRegistrado:   dto.deficitRegistrado,
        justificativaDeficit: dto.justificativaDeficit,
        status:              'CONVERTIDA',
      },
    })

    // ── GUARDRAIL 2: OS com snapshot imutável ─────────────
    const snapshot = {
      rota:       { origem: cotacao.origem, destino: cotacao.destino, km: cotacao.kmEstimado },
      cliente:    { id: cotacao.clienteId, nome: cotacao.cliente.nome },
      veiculo:    { id: cotacao.veiculoId, placa: cotacao.veiculo.placa },
      motorista:  cotacao.motoristaId,
      custoKm:    cotacao.custoKmSnapshot,
      custoBase:  cotacao.custoTotalBase,
      margem:     dto.margemPct,
      valorFinal,
      geradoPor:  usuarioId,
      timestamp:  new Date().toISOString(),
      aprovadoPeloGestor: !!opcoes?.forcarAprovacao,
    }

    const os = await this.prisma.ordemServico.create({
      data: {
        cotacaoId: cotacao.id,
        snapshot,
        status:    'AGUARDANDO',
        ...(opcoes?.forcarAprovacao ? { aprovadorId: usuarioId } : {}),
      },
    })

    // Alerta de meta ferida (KM ou faturamento) — só avisa, não bloqueia
    if (validacaoMetas.precisaAprovacao) {
      await this.alertasService.disparar({
        categoria: 'COMERCIAL',
        evento: 'META_FERIDA',
        mensagem: `OS #${os.numero} ultrapassa limite operacional do mês. ${validacaoMetas.mensagem}`,
        contexto: { osId: os.id, cotacaoId: cotacao.id },
      })
    }

    return {
      os: {
        id:         os.id,
        numero:     os.numero,
        valorFinal,
        margem:     dto.margemPct,
        status:     os.status,
        geradaEm:   os.geradaEm,
      },
      alertaMetas: validacaoMetas.precisaAprovacao ? {
        precisaAprovacao: true,
        mensagem: validacaoMetas.mensagem,
      } : null,
    }
  }

  // ── Lista cotações aguardando aprovação do gestor (margem negativa) ──
  async listarPendentesAprovacao() {
    return this.prisma.cotacao.findMany({
      where: { status: 'PENDENTE_APROVACAO' },
      include: {
        cliente:   { select: { nome: true } },
        veiculo:   { select: { placa: true } },
        criadoPor: { select: { nome: true } },
      },
      orderBy: { criadoEm: 'desc' },
    })
  }

  // ── Aprovação manual do gestor para cotação com margem negativa ──
  async aprovarPeloGestor(cotacaoId: string, gestorId: string, dto: AprovarCotacaoDto) {
    const cotacao = await this.prisma.cotacao.findUnique({
      where: { id: cotacaoId },
    })
    if (!cotacao) throw new NotFoundException('Cotação não encontrada')
    if (cotacao.status !== 'PENDENTE_APROVACAO') {
      throw new BadRequestException('Esta cotação não está pendente de aprovação')
    }

    const resultado = await this.confirmar(
      { cotacaoId, margemPct: cotacao.margemPct } as ConfirmarCotacaoDto,
      gestorId,
      { forcarAprovacao: true },
    )

    // Trilha de auditoria
    await this.prisma.auditLog.create({
      data: {
        usuarioId: gestorId,
        entidade: 'Cotacao',
        registroId: cotacaoId,
        acao: 'APROVAR_MARGEM_NEGATIVA',
        motivo: dto.motivo,
        depois: { margemPct: cotacao.margemPct, motivo: dto.motivo },
      },
    })

    return resultado
  }

  // ── Busca cotação por ID ──────────────────────────────────
  async findById(id: string) {
    const cotacao = await this.prisma.cotacao.findUnique({
      where: { id },
      include: {
        cliente:     true,
        veiculo:     true,
        motorista:   { include: { usuario: true } },
        criadoPor:   true,
        ordemServico: true,
      },
    })
    if (!cotacao) throw new NotFoundException('Cotação não encontrada')
    return cotacao
  }

  // ── Lista histórico de cotações ───────────────────────────
  async listar(pagina = 1, limite = 20) {
    const skip = (pagina - 1) * limite
    const [cotacoes, total] = await Promise.all([
      this.prisma.cotacao.findMany({
        skip,
        take: limite,
        orderBy: { criadoEm: 'desc' },
        include: { cliente: true, veiculo: true, ordemServico: true },
      }),
      this.prisma.cotacao.count(),
    ])
    return { cotacoes, total, pagina, limite }
  }

  // ── Cancela cotação ───────────────────────────────────────
  async cancelar(id: string, motivo: string) {
    const cotacao = await this.prisma.cotacao.findUnique({ where: { id } })
    if (!cotacao) throw new NotFoundException('Cotação não encontrada')
    if (cotacao.status === 'CANCELADA') throw new BadRequestException('Cotação já cancelada')

    return this.prisma.cotacao.update({
      where: { id },
      data: { status: 'CANCELADA', motivoCancelamento: motivo },
    })
  }

  // ── Solicita alteração de OS (vai para fila do gestor) ────
  async solicitarAlteracaoOs(dto: AlterarOsDto, usuarioId: string) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: dto.osId },
      include: { cotacao: true },
    })
    if (!os) throw new NotFoundException('OS não encontrada')

    // Registra em auditoria (snapshot antes preservado)
    await this.prisma.auditLog.create({
      data: {
        usuarioId,
        entidade:   'OrdemServico',
        registroId: os.id,
        acao:       'SOLICITAR_ALTERACAO',
        antes:      os.snapshot as any,
        motivo:     dto.motivo,
      },
    })

    // Alerta ao gestor sobre a solicitação de alteração
    await this.alertasService.disparar({
      categoria: 'OPERACIONAL',
      evento: 'SOLICITACAO_ALTERACAO_OS',
      mensagem: `Solicitação de alteração na OS — motivo: ${dto.motivo}`,
      contexto: { osId: os.id, motivo: dto.motivo },
    })

    return {
      mensagem: 'Solicitação de alteração enviada ao gestor principal.',
      osId: os.id,
      motivo: dto.motivo,
    }
  }

  // ── Painel de metas para o atendimento ───────────────────
  async getPainelMetas() {
    const [meta, saldo] = await Promise.all([
      this.metasService.getMetas(),
      this.saldoService.getSaldo(),
    ])

    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const [faturadoMes, kmMes, ossAbertas] = await Promise.all([
      this.prisma.lancamento.aggregate({
        where: { tipo: 'R', criadoEm: { gte: inicioMes }, status: { not: 'CANCELADO' } },
        _sum: { valor: true },
      }),
      this.prisma.viagem.aggregate({
        where: { criadoEm: { gte: inicioMes } },
        _sum: { kmRodado: true },
      }),
      this.prisma.ordemServico.count({
        where: { status: { in: ['AGUARDANDO', 'EM_ANDAMENTO'] } },
      }),
    ])

    const faturado = faturadoMes._sum.valor ?? 0
    const kmRodado = kmMes._sum.kmRodado ?? 0

    return {
      faturamento: {
        realizado:  faturado,
        minimo:     meta?.faturamentoMinimo ?? 0,
        falta:      Math.max(0, (meta?.faturamentoMinimo ?? 0) - faturado),
      },
      km: {
        rodado:  kmRodado,
        maximo:  meta?.kmMaximo ?? 0,
        restam:  Math.max(0, (meta?.kmMaximo ?? 0) - kmRodado),
      },
      ossAbertas,
      saldoARecuperar: saldo,
    }
  }

  // ── Detalhe de uma OS específica (cotação + viagem + comissão) ───
  async buscarOsPorId(osId: string) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: osId },
      include: {
        viagem: true,
        comissao: true,
      },
    })

    if (!os) throw new NotFoundException('Ordem de serviço não encontrada')

    return {
      id: os.id,
      numero: os.numero,
      status: os.status,
      snapshot: os.snapshot,
      viagem: os.viagem,
      comissao: os.comissao,
    }
  }
}