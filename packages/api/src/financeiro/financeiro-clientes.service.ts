import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
 
@Injectable()
export class FinanceiroClientesService {
  constructor(private prisma: PrismaService) {}
 
  // Calcula data de recebimento baseada na regra do cliente
  calcularDataRecebimento(dataEmissao: Date, regra: Record<string, any>): Date {
    const data = new Date(dataEmissao)
 
    if (regra.tipo === 'dias') {
      data.setDate(data.getDate() + regra.valor)
      return data
    }
 
    if (regra.tipo === 'dia_mes') {
      const proxMes = regra.proximo_mes
      if (proxMes) data.setMonth(data.getMonth() + 1)
      data.setDate(regra.dia)
      return data
    }
 
    if (regra.tipo === 'dias_mes') {
      // Ex: Gente — dia 20, 30 ou 10 do próximo mês (rotativo)
      const dias: number[] = regra.dias
      const diaAtual = dataEmissao.getDate()
      const proximo  = dias.find(d => d > diaAtual) ?? dias[0]
      if (proximo <= diaAtual) data.setMonth(data.getMonth() + 1)
      data.setDate(proximo)
      return data
    }
 
    // Fallback: 30 dias
    data.setDate(data.getDate() + 30)
    return data
  }
 
  async getClienteComRegra(clienteId: string) {
    return this.prisma.cliente.findUnique({
      where:   { id: clienteId },
      include: { tabelaMinima: true },
    })
  }
 
  // Calcula taxa de pontualidade do cliente
  async getTaxaPontualidade(clienteId: string) {
    const lancamentos = await this.prisma.lancamento.findMany({
      where: {
        clienteId,
        tipo:   'R',
        status: { in: ['PAGO', 'ATRASADO'] },
      },
      select: { vencimento: true, pagoEm: true, status: true },
    })
 
    if (lancamentos.length === 0) return null
 
    const pagosNoPrazo = lancamentos.filter(l =>
      l.pagoEm && l.pagoEm <= l.vencimento
    ).length
 
    return {
      total:         lancamentos.length,
      pagosNoPrazo,
      taxaPct:       parseFloat(((pagosNoPrazo / lancamentos.length) * 100).toFixed(1)),
    }
  }
}