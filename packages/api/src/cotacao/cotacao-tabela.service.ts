import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
 
@Injectable()
export class CotacaoTabelaService {
  constructor(private prisma: PrismaService) {}
 
  async getTabelaMinima(clienteId: string) {
    return this.prisma.tabelaMinima.findUnique({
      where: { clienteId },
      include: { cliente: true },
    })
  }
 
  async validarContraTabela(clienteId: string, valorFinal: number, kmEstimado: number): Promise<{
    abaixoDoMinimo: boolean
    valorMinimo?: number
    mediaKmCliente?: number
  }> {
    const tabela = await this.getTabelaMinima(clienteId)
    if (!tabela) return { abaixoDoMinimo: false }
 
    // Calcula valor mínimo baseado na tabela
    let valorMinimo = tabela.valorSaida ?? 0
    if (kmEstimado && tabela.kmSaida && kmEstimado > tabela.kmSaida) {
      const kmExcedente = kmEstimado - tabela.kmSaida
      valorMinimo += kmExcedente * (tabela.kmExcedente ?? 0)
    }
 
    return {
      abaixoDoMinimo: valorFinal < valorMinimo,
      valorMinimo,
      mediaKmCliente: tabela.mediaKmTotal ?? undefined,
    }
  }
 
  async atualizarMediaKm(clienteId: string): Promise<void> {
    // Recalcula média R$/km de todas as OSs deste cliente
    const oss = await this.prisma.ordemServico.findMany({
      where: {
        cotacao: { clienteId },
        status: 'CONCLUIDA',
      },
      include: { cotacao: true, viagem: true },
    })
 
    if (oss.length === 0) return
 
    const totalValor = oss.reduce((acc, os) => acc + os.cotacao.valorFinal, 0)
    const totalKm = oss.reduce((acc, os) => acc + (os.viagem?.kmRodado ?? 0), 0)
 
    if (totalKm === 0) return
 
    const mediaKm = totalValor / totalKm
 
    await this.prisma.tabelaMinima.upsert({
      where: { clienteId },
      update: { mediaKmTotal: mediaKm },
      create: { clienteId, mediaKmTotal: mediaKm },
    })
  }
}