import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
 
@Injectable()
export class CotacaoSaldoService {
  constructor(private prisma: PrismaService) {}
 
  async getSaldo(): Promise<number> {
    const saldo = await this.prisma.saldoRecuperar.findUnique({
      where: { id: 'singleton' },
    })
    return saldo?.saldoTotal ?? 0
  }
 
  async adicionarDeficit(valor: number): Promise<void> {
    await this.prisma.saldoRecuperar.upsert({
      where: { id: 'singleton' },
      update: { saldoTotal: { increment: valor } },
      create: { id: 'singleton', saldoTotal: valor },
    })
  }
 
  async abaterSaldo(valor: number): Promise<void> {
    const saldo = await this.getSaldo()
    const novoSaldo = Math.max(0, saldo - valor)
    await this.prisma.saldoRecuperar.update({
      where: { id: 'singleton' },
      data: { saldoTotal: novoSaldo },
    })
  }
 
  // Sugere margem ajustada para cima quando há saldo a recuperar
  calcularMargemSugerida(margemBase: number, saldoAtual: number, valorCotacao: number): number {
    if (saldoAtual <= 0) return margemBase
    // Sugere +2% a +5% dependendo do saldo
    const ajuste = saldoAtual > valorCotacao * 2 ? 5 : 2
    return Math.min(margemBase + ajuste, 20)
  }
}