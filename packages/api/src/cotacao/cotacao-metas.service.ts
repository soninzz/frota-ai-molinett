import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
 
@Injectable()
export class CotacaoMetasService {
  constructor(private prisma: PrismaService) {}
 
  async getMetas() {
    const meta = await this.prisma.metaOperacional.findUnique({
      where: { id: 'singleton' },
    })
    return meta
  }
 
  async validarContraMetas(valorOS: number, kmEstimado: number): Promise<{
    faturamentoOk: boolean
    kmOk: boolean
    precisaAprovacao: boolean
    mensagem?: string
  }> {
    const meta = await this.getMetas()
    // Meta ainda não calculada de verdade (sem despesas cadastradas no mês
    // ainda) — kmMaximo=0 nesse caso significa "sem dado", não "não pode
    // rodar nada". Tratar como meta ausente evita bloquear toda cotação.
    if (!meta || meta.kmMaximo <= 0) return { faturamentoOk: true, kmOk: true, precisaAprovacao: false }

    // Busca total já faturado no mês
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)
 
    const totalMes = await this.prisma.lancamento.aggregate({
      where: {
        tipo: 'R',
        criadoEm: { gte: inicioMes },
        status: { not: 'CANCELADO' },
      },
      _sum: { valor: true },
    })
 
    const faturadoAtual = totalMes._sum.valor ?? 0
    const faturamentoOk = (faturadoAtual + valorOS) >= meta.faturamentoMinimo * 0.8
 
    // Busca km total rodado no mês
    const kmMes = await this.prisma.viagem.aggregate({
      where: { criadoEm: { gte: inicioMes } },
      _sum: { kmRodado: true },
    })
 
    const kmAtual = kmMes._sum.kmRodado ?? 0
    const kmOk = (kmAtual + kmEstimado) <= meta.kmMaximo
 
    const precisaAprovacao = !kmOk
 
    let mensagem: string | undefined
    if (!kmOk) {
      mensagem = `KM estimado ultrapassa o limite operacional do mês. KM atual: ${kmAtual}, limite: ${meta.kmMaximo}`
    }
 
    return { faturamentoOk, kmOk, precisaAprovacao, mensagem }
  }
}