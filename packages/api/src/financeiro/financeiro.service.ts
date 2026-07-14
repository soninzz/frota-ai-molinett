import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CriarLancamentoDto, BaixarLancamentoDto } from './dto/lancamento.dto'
import { FinanceiroClientesService } from './financeiro-clientes.service'
import { FinanceiroMetasService } from './financeiro-metas.service'
import { paraCsv } from '../common/csv.util'
 
@Injectable()
export class FinanceiroService {
  constructor(
    private prisma:    PrismaService,
    private clientes:  FinanceiroClientesService,
    private metas:     FinanceiroMetasService,
  ) {}
 
  // ── Criar lançamento ──────────────────────────────────────
  async criarLancamento(dto: CriarLancamentoDto) {
    // Guardrail 5: conta bancária obrigatória
    if (!dto.contaBancariaId) {
      throw new BadRequestException('Conta bancária é obrigatória em todo lançamento.')
    }
 
    const conta = await this.prisma.contaBancaria.findUnique({
      where: { id: dto.contaBancariaId },
    })
    if (!conta) throw new BadRequestException('Conta bancária não encontrada.')
 
    // Se for recebível (R) e tiver cliente, aplica regra de prazo
    let vencimento = new Date(dto.vencimento)
    if (dto.tipo === 'R' && dto.clienteId) {
      const cliente = await this.clientes.getClienteComRegra(dto.clienteId)
      if (cliente?.regraPrazo) {
        vencimento = this.clientes.calcularDataRecebimento(
          new Date(),
          cliente.regraPrazo as Record<string, any>
        )
      }
    }
 
    return this.prisma.lancamento.create({
      data: {
        tipo:            dto.tipo,
        descricao:       dto.descricao,
        valor:           dto.valor,
        vencimento,
        contaBancariaId: dto.contaBancariaId,
        formaPagamento:  dto.formaPagamento,
        centroCustoId:   dto.centroCustoId,
        contaContabilId: dto.contaContabilId,
        clienteId:       dto.clienteId,
        veiculoId:       dto.veiculoId,
        dataNf:          dto.dataNf ? new Date(dto.dataNf) : undefined,
        nfeChave:        dto.nfeChave,
        observacao:      dto.observacao,
        recorrente:      dto.recorrente,
        periocidade: dto.periodicidade,
        status:          'PENDENTE',
      },
    })
  }
 
  // ── Baixar lançamento (marcar como pago) ──────────────────
  async baixarLancamento(dto: BaixarLancamentoDto) {
    const lancamento = await this.prisma.lancamento.findUnique({
      where: { id: dto.lancamentoId },
    })
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado')
    if (lancamento.status === 'PAGO') throw new BadRequestException('Lançamento já pago')
 
    const pagoEm   = new Date(dto.pagoEm)
    const atrasado = pagoEm > lancamento.vencimento
 
    return this.prisma.lancamento.update({
      where: { id: dto.lancamentoId },
      data:  {
        status: atrasado ? 'ATRASADO' : 'PAGO',
        pagoEm,
        ...(dto.valorPago && { valor: dto.valorPago }),
      },
    })
  }
 
  // ── Fluxo de caixa projetado (90 dias) ───────────────────
  async getFluxoCaixa(dias = 90) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
 
    const fim = new Date(hoje)
    fim.setDate(hoje.getDate() + dias)
 
    const lancamentos = await this.prisma.lancamento.findMany({
      where: {
        vencimento: { gte: hoje, lte: fim },
        status:     { not: 'CANCELADO' },
      },
      orderBy: { vencimento: 'asc' },
      include: { cliente: true, contaBancaria: true },
    })
 
    // Agrupa por dia
    const porDia: Record<string, { entradas: number; saidas: number; lancamentos: any[] }> = {}
 
    for (const l of lancamentos) {
      const dia = l.vencimento.toISOString().split('T')[0]
      if (!porDia[dia]) porDia[dia] = { entradas: 0, saidas: 0, lancamentos: [] }
 
      if (l.tipo === 'R') {
        porDia[dia].entradas += l.valor
      } else {
        porDia[dia].saidas += l.valor
      }
      porDia[dia].lancamentos.push({
        id:        l.id,
        tipo:      l.tipo,
        descricao: l.descricao,
        valor:     l.valor,
        cliente:   l.cliente?.nome,
        status:    l.status,
      })
    }
 
    // Monta curva acumulada
    let saldoAcumulado = 0
    const curva = Object.entries(porDia).map(([dia, dados]) => {
      saldoAcumulado += dados.entradas - dados.saidas
      return {
        dia,
        entradas:        dados.entradas,
        saidas:          dados.saidas,
        saldoDia:        dados.entradas - dados.saidas,
        saldoAcumulado,
        lancamentos:     dados.lancamentos,
      }
    })
 
    return {
      periodo:    { inicio: hoje, fim },
      curva,
      totais: {
        entradas: lancamentos.filter(l => l.tipo === 'R').reduce((a, l) => a + l.valor, 0),
        saidas:   lancamentos.filter(l => l.tipo !== 'R').reduce((a, l) => a + l.valor, 0),
      },
    }
  }
 
  // ── Contas a pagar/receber ────────────────────────────────
  async listarLancamentos(tipo?: string, status?: string, pagina = 1, limite = 20) {
    const skip = (pagina - 1) * limite
 
    const where: any = {}
    if (tipo)   where.tipo   = tipo
    if (status) where.status = status
 
    const [lancamentos, total] = await Promise.all([
      this.prisma.lancamento.findMany({
        where,
        skip,
        take:    limite,
        orderBy: { vencimento: 'asc' },
        include: { cliente: true, veiculo: true, contaBancaria: true },
      }),
      this.prisma.lancamento.count({ where }),
    ])
 
    return { lancamentos, total, pagina, limite }
  }

  // ── Exportação de lançamentos (CSV, pronto pra Excel) ─────
  async exportarLancamentosCsv(tipo?: string, status?: string) {
    const where: any = {}
    if (tipo)   where.tipo   = tipo
    if (status) where.status = status

    const lancamentos = await this.prisma.lancamento.findMany({
      where,
      orderBy: { vencimento: 'asc' },
      include: { cliente: true, veiculo: true, contaBancaria: true, centroCusto: true },
    })

    const colunas = [
      'Tipo', 'Descrição', 'Valor', 'Vencimento', 'Status', 'Pago em',
      'Cliente', 'Veículo', 'Centro de custo', 'Conta bancária', 'Observação',
    ]
    const linhas = lancamentos.map((l) => [
      l.tipo,
      l.descricao,
      l.valor.toFixed(2).replace('.', ','),
      l.vencimento.toISOString().slice(0, 10),
      l.status,
      l.pagoEm ? l.pagoEm.toISOString().slice(0, 10) : '',
      l.cliente?.nome ?? '',
      l.veiculo?.placa ?? '',
      l.centroCusto?.nome ?? '',
      l.contaBancaria?.banco ?? '',
      l.observacao ?? '',
    ])

    return paraCsv(colunas, linhas)
  }

  // ── Contas atrasadas ──────────────────────────────────────
  async getAtrasados() {
    const hoje = new Date()
    return this.prisma.lancamento.findMany({
      where: {
        vencimento: { lt: hoje },
        status:     'PENDENTE',
      },
      orderBy: { vencimento: 'asc' },
      include: { cliente: true, contaBancaria: true },
    })
  }
 
  // ── Reagendar recebível atrasado ──────────────────────────
  async reagendarLancamento(lancamentoId: string) {
    const lancamento = await this.prisma.lancamento.findUnique({
      where: { id: lancamentoId },
    })
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado')
 
    // Próximo dia útil
    const proximoDiaUtil = new Date()
    proximoDiaUtil.setDate(proximoDiaUtil.getDate() + 1)
    while (proximoDiaUtil.getDay() === 0 || proximoDiaUtil.getDay() === 6) {
      proximoDiaUtil.setDate(proximoDiaUtil.getDate() + 1)
    }
 
    return this.prisma.lancamento.update({
      where: { id: lancamentoId },
      data:  { vencimento: proximoDiaUtil },
    })
  }
 
  // ── DRE resumido ──────────────────────────────────────────
  async getDre(mes: string) {
    const [ano, mesNum] = mes.split('-').map(Number)
    const inicio = new Date(ano, mesNum - 1, 1)
    const fim    = new Date(ano, mesNum, 0, 23, 59, 59)
 
    const lancamentos = await this.prisma.lancamento.findMany({
      where: {
        vencimento: { gte: inicio, lte: fim },
        status:     { not: 'CANCELADO' },
      },
      include: { centroCusto: true, contaContabil: true, veiculo: true },
    })
 
    // Agrupa por grupo contábil
    const grupos: Record<string, { receita: number; despesa: number }> = {}
 
    for (const l of lancamentos) {
      const grupo = l.contaContabil?.grupo ?? 'SEM_GRUPO'
      if (!grupos[grupo]) grupos[grupo] = { receita: 0, despesa: 0 }
 
      if (l.tipo === 'R') {
        grupos[grupo].receita += l.valor
      } else {
        grupos[grupo].despesa += l.valor
      }
    }
 
    const receitaTotal  = lancamentos.filter(l => l.tipo === 'R').reduce((a, l) => a + l.valor, 0)
    const despesaTotal  = lancamentos.filter(l => l.tipo !== 'R').reduce((a, l) => a + l.valor, 0)
    const resultadoLiquido = receitaTotal - despesaTotal
 
    return {
      mes,
      grupos,
      receitaTotal,
      despesaTotal,
      resultadoLiquido,
      margemPct: receitaTotal > 0
        ? parseFloat(((resultadoLiquido / receitaTotal) * 100).toFixed(1))
        : 0,
    }
  }
 
  // ── Simulador de financiamento ────────────────────────────
  simularFinanciamento(
    valorTotal:  number,
    parcelas:    number,
    taxaMensal:  number, // % ao mês
  ) {
    const taxa = taxaMensal / 100
 
    // Cálculo price (parcelas fixas)
    const parcela = taxa > 0
      ? valorTotal * (taxa * Math.pow(1 + taxa, parcelas)) / (Math.pow(1 + taxa, parcelas) - 1)
      : valorTotal / parcelas
 
    const totalPago   = parcela * parcelas
    const totalJuros  = totalPago - valorTotal
 
    // Projeta impacto no fluxo de caixa
    const hoje = new Date()
    const cronograma = Array.from({ length: parcelas }, (_, i) => {
      const venc = new Date(hoje)
      venc.setMonth(venc.getMonth() + i + 1)
      return {
        numero:     i + 1,
        vencimento: venc.toISOString().split('T')[0],
        valor:      parseFloat(parcela.toFixed(2)),
      }
    })
 
    return {
      valorTotal,
      parcelas,
      taxaMensal,
      valorParcela:  parseFloat(parcela.toFixed(2)),
      totalPago:     parseFloat(totalPago.toFixed(2)),
      totalJuros:    parseFloat(totalJuros.toFixed(2)),
      cronograma,
    }
  }
 
  // ── Comparador de cenários (TIR/VPL) ─────────────────────
  compararCenarios(
    valor:       number,
    cenarios:    { nome: string; retornoMensal: number; prazoMeses: number }[]
  ) {
    return cenarios.map(c => {
      const taxa    = c.retornoMensal / 100
      const retorno = valor * Math.pow(1 + taxa, c.prazoMeses)
      const lucro   = retorno - valor
      const vpl     = lucro / Math.pow(1 + 0.01, c.prazoMeses) // desconta a 1% a.m.
 
      return {
        nome:          c.nome,
        prazoMeses:    c.prazoMeses,
        retornoMensal: c.retornoMensal,
        valorFinal:    parseFloat(retorno.toFixed(2)),
        lucroTotal:    parseFloat(lucro.toFixed(2)),
        vpl:           parseFloat(vpl.toFixed(2)),
      }
    }).sort((a, b) => b.vpl - a.vpl) // ordena pelo melhor VPL
  }
 
  // ── Painel financeiro ─────────────────────────────────────
  async getPainelFinanceiro() {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
 
    const em7dias  = new Date(hoje); em7dias.setDate(hoje.getDate() + 7)
    const em30dias = new Date(hoje); em30dias.setDate(hoje.getDate() + 30)
 
    const [metas, saldo, aVencer7, aVencer30, atrasados, fluxo] = await Promise.all([
      this.metas.getMetas(),
      this.prisma.saldoRecuperar.findUnique({ where: { id: 'singleton' } }),
      this.prisma.lancamento.aggregate({
        where:  { vencimento: { gte: hoje, lte: em7dias }, status: 'PENDENTE', tipo: { not: 'R' } },
        _sum:   { valor: true },
        _count: { id: true },
      }),
      this.prisma.lancamento.aggregate({
        where:  { vencimento: { gte: hoje, lte: em30dias }, status: 'PENDENTE', tipo: { not: 'R' } },
        _sum:   { valor: true },
        _count: { id: true },
      }),
      this.prisma.lancamento.aggregate({
        where:  { vencimento: { lt: hoje }, status: 'PENDENTE' },
        _sum:   { valor: true },
        _count: { id: true },
      }),
      this.getFluxoCaixa(30),
    ])
 
    return {
      metas: {
        faturamentoMinimo: metas?.faturamentoMinimo ?? 0,
        kmMaximo:          metas?.kmMaximo ?? 0,
        mesReferencia:     metas?.mesReferencia,
      },
      saldoARecuperar: saldo?.saldoTotal ?? 0,
      alertas: {
        aVencer7dias:  { total: aVencer7._count.id,  valor: aVencer7._sum.valor ?? 0 },
        aVencer30dias: { total: aVencer30._count.id, valor: aVencer30._sum.valor ?? 0 },
        atrasados:     { total: atrasados._count.id, valor: atrasados._sum.valor ?? 0 },
      },
      fluxo30dias: fluxo,
    }
  }
}