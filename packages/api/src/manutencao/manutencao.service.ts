import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CriarOsManutencaoDto, AtualizarStatusOsDto } from './dto/manutencao.dto'
import { StatusOsManutencao } from '@prisma/client'
 
@Injectable()
export class ManutencaoService {
  constructor(private prisma: PrismaService) {}
 
  async criarOs(dto: CriarOsManutencaoDto, usuarioId: string) {
    return this.prisma.osManutencao.create({
      data: {
        veiculoId:      dto.veiculoId,
        solicitanteId:  usuarioId,
        descricao:      dto.descricao,
        prioridade:     dto.prioridade,
        subsistema:     dto.subsistema,
        oficina:        dto.oficina,
        valorEstimado:  dto.valorEstimado,
        prazoEstimado:  dto.prazoEstimado ? new Date(dto.prazoEstimado) : undefined,
        status:         StatusOsManutencao.SOLICITADO,
      },
      include: { veiculo: true },
    })
  }
 
  async listar(veiculoId?: string, status?: string) {
    return this.prisma.osManutencao.findMany({
      where: {
        ...(veiculoId && { veiculoId }),
        ...(status    && { status: status as StatusOsManutencao }),
      },
      orderBy: [
        { prioridade: 'asc' },
        { criadoEm:   'desc' },
      ],
      include: { veiculo: true },
    })
  }
 
  async atualizarStatus(id: string, dto: AtualizarStatusOsDto) {
    const os = await this.prisma.osManutencao.findUnique({ where: { id } })
    if (!os) throw new NotFoundException('OS de manutenção não encontrada')
 
    const data: any = { status: dto.status }
    if (dto.valorReal)   data.valorReal   = dto.valorReal
    if (dto.observacao)  data.observacao  = dto.observacao
    if (dto.status === 'CONCLUIDO') data.concluidoEm = new Date()
 
    return this.prisma.osManutencao.update({ where: { id }, data })
  }
 
  // Análise preditiva — detecta concentração de falhas por setor
  async analisePreditiva(veiculoId: string) {
    const noventa_dias = new Date()
    noventa_dias.setDate(noventa_dias.getDate() - 90)
 
    const osPorSubsistema = await this.prisma.osManutencao.groupBy({
      by:     ['subsistema'],
      where:  { veiculoId, criadoEm: { gte: noventa_dias }, subsistema: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })
 
    const alertas = osPorSubsistema
      .filter(s => s._count.id >= 5) // limiar: 5 OSs em 90 dias
      .map(s => ({
        subsistema: s.subsistema,
        quantidade: s._count.id,
        alerta:     `${s._count.id} OSs no subsistema "${s.subsistema}" nos últimos 90 dias. Considere revisão completa.`,
      }))
 
    return { veiculoId, alertas, analisadoEm: new Date() }
  }
 
  // Revisões por item
  async getRevisoes(veiculoId: string) {
    const hoje     = new Date()
    const em30dias = new Date()
    em30dias.setDate(hoje.getDate() + 30)
 
    const itens = await this.prisma.itemRevisao.findMany({
      where:   { veiculoId, ativo: true },
      orderBy: { dataProxima: 'asc' },
    })
 
    return itens.map(item => ({
      ...item,
      status: !item.dataProxima ? 'ok' :
              item.dataProxima <= hoje     ? 'vencido' :
              item.dataProxima <= em30dias ? 'proximo' : 'ok',
    }))
  }
 
  async registrarTrocaItem(itemRevisaoId: string, kmAtual: number, fornecedor?: string, valor?: number) {
    const item = await this.prisma.itemRevisao.findUnique({
      where: { id: itemRevisaoId },
    })
    if (!item) throw new NotFoundException('Item de revisão não encontrado')
 
    // Registra no histórico
    await this.prisma.historicoRevisao.create({
      data: {
        itemRevisaoId,
        kmNaMoment:  kmAtual,
        dataTroca:   new Date(),
        fornecedor,
        valor,
      },
    })
 
    // Recalcula APENAS este item (não zera os outros — guardrail do escopo)
    const updates: any = { dataProxima: null, kmProximo: null }
    if (item.kmIntervalo)  updates.kmProximo   = kmAtual + item.kmIntervalo
    if (item.diasIntervalo) {
      const proxima = new Date()
      proxima.setDate(proxima.getDate() + item.diasIntervalo)
      updates.dataProxima = proxima
    }
 
    return this.prisma.itemRevisao.update({
      where: { id: itemRevisaoId },
      data:  updates,
    })
  }
}