import { Injectable } from '@nestjs/common'
import { Perfil } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditoriaService } from '../auditoria/auditoria.service'

// Recursos (módulos) que aceitam override de RBAC via /sistema/permissoes.
// Controllers marcam suas rotas com @Recurso(nome) usando estes valores.
export const RECURSOS_DISPONIVEIS = [
  'cotacao',
  'frota',
  'manutencao',
  'diesel',
  'pneus',
  'financeiro',
  'jornada',
  'clientes',
  'sinistros',
  'simulador',
  'ocr',
  'auditoria',
  'integracoes',
  'usuarios',
] as const

@Injectable()
export class PermissoesService {
  constructor(
    private prisma: PrismaService,
    private auditoria: AuditoriaService,
  ) {}

  // Matriz completa perfil × recurso, com o override atual (se houver) —
  // sem override, o acesso continua sendo o @Roles() hardcoded do controller.
  async matriz() {
    const overrides = await this.prisma.regraPermissao.findMany()
    const porChave = new Map(overrides.map((o) => [`${o.perfil}:${o.recurso}`, o]))

    const perfis = Object.values(Perfil)
    return perfis.map((perfil) => ({
      perfil,
      recursos: RECURSOS_DISPONIVEIS.map((recurso) => {
        const override = porChave.get(`${perfil}:${recurso}`)
        return {
          recurso,
          override: override ? override.permitido : null, // null = usa o padrão do código
          atualizadoEm: override?.atualizadoEm ?? null,
        }
      }),
    }))
  }

  async definirOverride(perfil: Perfil, recurso: string, permitido: boolean | null, usuarioId: string) {
    if (permitido === null) {
      await this.prisma.regraPermissao.deleteMany({ where: { perfil, recurso } })
    } else {
      await this.prisma.regraPermissao.upsert({
        where: { perfil_recurso: { perfil, recurso } },
        update: { permitido, atualizadoPor: usuarioId },
        create: { perfil, recurso, permitido, atualizadoPor: usuarioId },
      })
    }

    await this.auditoria.registrar({
      usuarioId,
      entidade: 'RegraPermissao',
      registroId: `${perfil}:${recurso}`,
      acao: 'DEFINIR_OVERRIDE',
      depois: { perfil, recurso, permitido },
    })

    return { perfil, recurso, permitido }
  }
}
