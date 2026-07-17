import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { AuditoriaService } from '../common/auditoria/auditoria.service'

@Injectable()
export class ComissoesService {
  constructor(
    private prisma: PrismaService,
    private auditoria: AuditoriaService,
  ) {}
 
  async listar(filtros: { motoristaId?: string; pago?: boolean }) {
    return this.prisma.comissao.findMany({
      where: {
        motoristaId: filtros.motoristaId,
        pago: filtros.pago,
      },
      include: {
        motorista: { select: { usuario: { select: { nome: true } } } },
        os: { select: { numero: true } },
      },
      orderBy: { criadoEm: 'desc' },
    })
  }
 
  async pagar(id: string, usuarioId?: string) {
    const comissao = await this.prisma.comissao.findUnique({ where: { id } })
    if (!comissao) throw new NotFoundException('Comissão não encontrada')
    if (comissao.pago) throw new BadRequestException('Comissão já está paga')

    const atualizada = await this.prisma.comissao.update({
      where: { id },
      data: { pago: true, pagoEm: new Date() },
    })

    if (usuarioId) {
      await this.auditoria.registrar({
        usuarioId,
        entidade: 'Comissao',
        registroId: id,
        acao: 'PAGAR',
        antes: { pago: false },
        depois: { pago: true, valor: atualizada.valor },
      })
    }

    return atualizada
  }
}