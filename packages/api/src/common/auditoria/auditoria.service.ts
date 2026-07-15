import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

interface RegistrarAuditoria {
  usuarioId: string
  entidade: string
  registroId: string
  acao: string
  antes?: unknown
  depois?: unknown
  motivo?: string
  ip?: string
}

// Auditoria é best-effort: uma falha ao gravar o log NUNCA pode derrubar a
// ação de negócio que está sendo auditada.
@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name)

  constructor(private prisma: PrismaService) {}

  async registrar(dados: RegistrarAuditoria): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          usuarioId: dados.usuarioId,
          entidade: dados.entidade,
          registroId: dados.registroId,
          acao: dados.acao,
          antes: dados.antes === undefined ? undefined : (dados.antes as object),
          depois: dados.depois === undefined ? undefined : (dados.depois as object),
          motivo: dados.motivo,
          ip: dados.ip,
        },
      })
    } catch (e) {
      this.logger.error(`Falha ao gravar auditoria (${dados.entidade}/${dados.acao})`, e)
    }
  }

  async historico(entidade: string, registroId: string) {
    return this.prisma.auditLog.findMany({
      where: { entidade, registroId },
      orderBy: { timestamp: 'desc' },
      include: { usuario: { select: { nome: true, email: true } } },
    })
  }
}
