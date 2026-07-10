import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
 
@Injectable()
export class FinanceiroMetasService {
  constructor(private prisma: PrismaService) {}
 
  async getMetas() {
    return this.prisma.metaOperacional.findUnique({
      where: { id: 'singleton' },
    })
  }
 
  // Recalcula metas dinamicamente — chamado pelo cron diário
  async recalcularMetas(): Promise<{ faturamentoMinimo: number; kmMaximo: number }> {
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)
 
    const fimMes = new Date(inicioMes)
    fimMes.setMonth(fimMes.getMonth() + 1)
 
    // Soma contas a pagar do mês
    const contasPagar = await this.prisma.lancamento.aggregate({
      where: {
        tipo:       { in: ['D', 'E', 'M'] },
        vencimento: { gte: inicioMes, lt: fimMes },
        status:     { not: 'CANCELADO' },
      },
      _sum: { valor: true },
    })
 
    const totalDespesas = contasPagar._sum.valor ?? 0
 
    // Margem de segurança configurável (padrão 10%)
    const meta = await this.getMetas()
    const margemSeguranca = meta?.margemSegurancaPct ?? 10
    const faturamentoMinimo = totalDespesas * (1 + margemSeguranca / 100)
 
    // KM máximo baseado no custo médio/km da frota
    const veiculos = await this.prisma.veiculo.findMany({
      where:  { ativo: true },
      select: { custoKmAtual: true },
    })
 
    const custoMedioKm = veiculos.length > 0
      ? veiculos.reduce((acc, v) => acc + (v.custoKmAtual ?? 4.5), 0) / veiculos.length
      : 4.5
 
    const kmMaximo = custoMedioKm > 0
      ? Math.floor(faturamentoMinimo / custoMedioKm)
      : 0
 
    // Atualiza no banco
    await this.prisma.metaOperacional.upsert({
      where:  { id: 'singleton' },
      update: {
        faturamentoMinimo,
        kmMaximo,
        mesReferencia: `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, '0')}`,
      },
      create: {
        id: 'singleton',
        faturamentoMinimo,
        kmMaximo,
        margemSegurancaPct: 10,
        mesReferencia: `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, '0')}`,
      },
    })
 
    return { faturamentoMinimo, kmMaximo }
  }
}