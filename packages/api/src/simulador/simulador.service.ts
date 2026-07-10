import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { MercadoService } from './mercado.service'
import { SimularDto, CriarCenarioDto } from './dto/simular.dto'
import { SimularFinanciamentoDto, CompararCenariosDto } from './dto/financiamento.dto'

export interface Baseline {
  receitaMensal: number
  despesaMensal: number
  dieselMensal: number
  litrosMensais: number
  precoMedioDiesel: number
  kmMensal: number
  consumoMedioKmL: number
  mesesAmostrados: number
}

export interface MesProjetado {
  mes: number
  receita: number
  custoDiesel: number
  custoFixo: number
  custoExtra: number
  custoTotal: number
  margem: number
  margemPct: number
  caixaAcumulado: number
}

export interface ResultadoSimulacao {
  baseline: Baseline
  premissas: SimularDto
  meses: MesProjetado[]
  totais: { receita: number; custo: number; margem: number; margemPct: number }
}

const DIAS_BASELINE = 90

@Injectable()
export class SimuladorService {
  constructor(
    private prisma: PrismaService,
    private mercado: MercadoService,
  ) {}

  // ── Média histórica dos últimos 90 dias, normalizada pra mensal ──
  async baseline(): Promise<Baseline> {
    const desde = new Date(Date.now() - DIAS_BASELINE * 24 * 60 * 60 * 1000)
    const meses = DIAS_BASELINE / 30

    const [receitas, despesas, diesel, km] = await Promise.all([
      this.prisma.lancamento.aggregate({
        where: { tipo: 'R', criadoEm: { gte: desde }, status: { not: 'CANCELADO' } },
        _sum: { valor: true },
      }),
      this.prisma.lancamento.aggregate({
        where: { tipo: { in: ['D', 'M', 'DP'] }, criadoEm: { gte: desde }, status: { not: 'CANCELADO' } },
        _sum: { valor: true },
      }),
      this.prisma.abastecimento.aggregate({
        where: { timestamp: { gte: desde } },
        _sum: { valorTotal: true, volumeLitros: true },
      }),
      this.prisma.viagem.aggregate({
        where: { concluidaEm: { gte: desde } },
        _sum: { kmRodado: true },
      }),
    ])

    const dieselTotal = diesel._sum.valorTotal ?? 0
    const litrosTotal = diesel._sum.volumeLitros ?? 0
    const kmTotal = km._sum.kmRodado ?? 0

    return {
      receitaMensal: (receitas._sum.valor ?? 0) / meses,
      despesaMensal: (despesas._sum.valor ?? 0) / meses,
      dieselMensal: dieselTotal / meses,
      litrosMensais: litrosTotal / meses,
      precoMedioDiesel: litrosTotal > 0 ? dieselTotal / litrosTotal : 0,
      kmMensal: kmTotal / meses,
      consumoMedioKmL: litrosTotal > 0 ? kmTotal / litrosTotal : 0,
      mesesAmostrados: meses,
    }
  }

  // ── Projeção mês a mês aplicando as premissas sobre o baseline ──
  async simular(dto: SimularDto): Promise<ResultadoSimulacao> {
    const base = await this.baseline()

    const receitaMes = base.receitaMensal * (1 + (dto.variacaoReceitaPct ?? 0) / 100)

    const kmMensal = dto.kmMensal ?? base.kmMensal
    const consumo = dto.consumoMedioKmL ?? (base.consumoMedioKmL || 1)
    const precoDiesel = dto.precoDiesel ?? base.precoMedioDiesel
    const custoDieselMes = consumo > 0 ? (kmMensal / consumo) * precoDiesel : 0

    // Custo fixo = despesa histórica menos a parcela de diesel (que é variável)
    const custoFixoBase = Math.max(0, base.despesaMensal - base.dieselMensal)
    const custoFixoMes = custoFixoBase * (1 + (dto.variacaoCustoFixoPct ?? 0) / 100)
    const custoExtraMes = dto.custoExtraMensal ?? 0

    const mesesProjetados: MesProjetado[] = []
    let caixa = 0
    for (let m = 1; m <= dto.mesesProjecao; m++) {
      const custoTotal = custoDieselMes + custoFixoMes + custoExtraMes
      const margem = receitaMes - custoTotal
      caixa += margem
      mesesProjetados.push({
        mes: m,
        receita: receitaMes,
        custoDiesel: custoDieselMes,
        custoFixo: custoFixoMes,
        custoExtra: custoExtraMes,
        custoTotal,
        margem,
        margemPct: receitaMes > 0 ? (margem / receitaMes) * 100 : 0,
        caixaAcumulado: caixa,
      })
    }

    const receitaTotal = receitaMes * dto.mesesProjecao
    const custoTotalGeral = mesesProjetados.reduce((acc, m) => acc + m.custoTotal, 0)
    return {
      baseline: base,
      premissas: dto,
      meses: mesesProjetados,
      totais: {
        receita: receitaTotal,
        custo: custoTotalGeral,
        margem: receitaTotal - custoTotalGeral,
        margemPct: receitaTotal > 0 ? ((receitaTotal - custoTotalGeral) / receitaTotal) * 100 : 0,
      },
    }
  }

  // ── Cenários salvos (comparador) ──
  async criarCenario(dto: CriarCenarioDto) {
    const { nome, descricao, ...premissas } = dto
    const resultado = await this.simular(premissas as SimularDto)
    return this.prisma.cenarioSimulacao.create({
      data: {
        nome,
        descricao,
        premissas: premissas as unknown as Prisma.InputJsonValue,
        resultado: resultado as unknown as Prisma.InputJsonValue,
      },
    })
  }

  async listarCenarios() {
    return this.prisma.cenarioSimulacao.findMany({ orderBy: { criadoEm: 'desc' } })
  }

  async excluirCenario(id: string) {
    const cenario = await this.prisma.cenarioSimulacao.findUnique({ where: { id } })
    if (!cenario) throw new NotFoundException('Cenário não encontrado')
    return this.prisma.cenarioSimulacao.delete({ where: { id } })
  }

  // ── Simulador de financiamento: "posso assumir parcela de R$ X?" ──
  // Projeta o caixa com a parcela incluída, aponta os meses em risco e
  // calcula o aumento de meta de faturamento necessário pra absorver.
  async simularFinanciamento(dto: SimularFinanciamentoDto) {
    const semParcela = await this.simular({
      mesesProjecao: dto.numParcelas,
      variacaoReceitaPct: dto.variacaoReceitaPct,
      variacaoCustoFixoPct: dto.variacaoCustoFixoPct,
    })
    const comParcela = await this.simular({
      mesesProjecao: dto.numParcelas,
      variacaoReceitaPct: dto.variacaoReceitaPct,
      variacaoCustoFixoPct: dto.variacaoCustoFixoPct,
      custoExtraMensal: dto.valorParcela,
    })

    const mesesEmRisco = comParcela.meses.filter((m) => m.margem < 0 || m.caixaAcumulado < 0)

    // Aumento de meta: parcela + margem de segurança de 10% (padrão do escopo)
    const aumentoMetaFaturamento = +(dto.valorParcela * 1.1).toFixed(2)

    return {
      parcela: dto.valorParcela,
      numParcelas: dto.numParcelas,
      viavel: mesesEmRisco.length === 0,
      mesesEmRisco: mesesEmRisco.map((m) => ({
        mes: m.mes,
        margem: +m.margem.toFixed(2),
        caixaAcumulado: +m.caixaAcumulado.toFixed(2),
      })),
      aumentoMetaFaturamento,
      caixaFinalSemParcela: +semParcela.meses[semParcela.meses.length - 1].caixaAcumulado.toFixed(2),
      caixaFinalComParcela: +comParcela.meses[comParcela.meses.length - 1].caixaAcumulado.toFixed(2),
      custoTotalFinanciamento: +(dto.valorParcela * dto.numParcelas).toFixed(2),
    }
  }

  // ── Comparador de cenários (TIR / VPL / payback) com taxas reais ──
  // Cenários: aplicar no CDI × antecipar dívida × reinvestir na operação.
  async compararCenariosInvestimento(dto: CompararCenariosDto) {
    const taxas = await this.mercado.taxas()
    const cdiMensal = Math.pow(1 + taxas.cdiAnualPct / 100, 1 / 12) - 1

    const cenarios: {
      cenario: string
      descricao: string
      tirAnualPct: number | null
      vpl: number
      paybackMeses: number | null
      valorFinal: number
    }[] = []

    // 1) Aplicar no CDI
    const valorFinalCdi = dto.valor * Math.pow(1 + cdiMensal, dto.meses)
    cenarios.push({
      cenario: 'APLICAR_CDI',
      descricao: `Aplicar R$ ${dto.valor.toFixed(2)} a ${taxas.cdiAnualPct}% a.a. (CDI real, ${taxas.referencia})`,
      tirAnualPct: taxas.cdiAnualPct,
      vpl: 0, // CDI é a própria taxa de desconto — VPL zero por definição
      paybackMeses: null,
      valorFinal: +valorFinalCdi.toFixed(2),
    })

    // 2) Antecipar dívida (economia = juros da dívida evitados)
    if (dto.taxaDividaAnualPct) {
      const dividaMensal = Math.pow(1 + dto.taxaDividaAnualPct / 100, 1 / 12) - 1
      const custoEvitado = dto.valor * Math.pow(1 + dividaMensal, dto.meses)
      const vpl = custoEvitado / Math.pow(1 + cdiMensal, dto.meses) - dto.valor
      cenarios.push({
        cenario: 'ANTECIPAR_DIVIDA',
        descricao: `Quitar dívida de ${dto.taxaDividaAnualPct}% a.a. — economia de juros`,
        tirAnualPct: dto.taxaDividaAnualPct,
        vpl: +vpl.toFixed(2),
        paybackMeses: null,
        valorFinal: +custoEvitado.toFixed(2),
      })
    }

    // 3) Reinvestir na operação (fluxo mensal estimado a partir do retorno anual)
    if (dto.retornoReinvestimentoAnualPct) {
      const fluxoMensal = (dto.valor * (dto.retornoReinvestimentoAnualPct / 100)) / 12
      let vpl = -dto.valor
      for (let m = 1; m <= dto.meses; m++) {
        vpl += fluxoMensal / Math.pow(1 + cdiMensal, m)
      }
      const paybackMeses = fluxoMensal > 0 ? Math.ceil(dto.valor / fluxoMensal) : null
      cenarios.push({
        cenario: 'REINVESTIR_OPERACAO',
        descricao: `Reinvestir com retorno estimado de ${dto.retornoReinvestimentoAnualPct}% a.a.`,
        tirAnualPct: dto.retornoReinvestimentoAnualPct,
        vpl: +vpl.toFixed(2),
        paybackMeses,
        valorFinal: +(dto.valor + fluxoMensal * dto.meses).toFixed(2),
      })
    }

    // Recomendação pelo VPL (desconto a CDI): aplicar no CDI é a base (VPL 0);
    // só vale sair dela se outro cenário criar valor presente positivo.
    const melhor = [...cenarios].sort((a, b) => b.vpl - a.vpl)[0]
    return { taxas, valor: dto.valor, meses: dto.meses, cenarios, recomendado: melhor.cenario }
  }

  // Reprocessa os cenários pedidos com o baseline atual e devolve lado a lado
  async comparar(ids: string[]) {
    const cenarios = await this.prisma.cenarioSimulacao.findMany({ where: { id: { in: ids } } })
    const comparativo = await Promise.all(
      cenarios.map(async (c) => ({
        id: c.id,
        nome: c.nome,
        descricao: c.descricao,
        resultado: await this.simular(c.premissas as unknown as SimularDto),
      })),
    )
    return comparativo
  }
}
