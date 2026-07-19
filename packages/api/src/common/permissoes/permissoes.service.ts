import { Injectable } from '@nestjs/common'
import { CategoriaAlerta, Perfil } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditoriaService } from '../auditoria/auditoria.service'
import { AlertasService } from '../../alertas/alertas.service'

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
  'estoque',
  'whatsapp',
] as const

@Injectable()
export class PermissoesService {
  constructor(
    private prisma: PrismaService,
    private auditoria: AuditoriaService,
    private alertas: AlertasService,
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

    // Mudança de RBAC é ação sensível (DoD camada transversal: "ação sensível
    // notifica o Gestor Principal") — hoje só painel, WhatsApp quando o canal
    // oficial estiver conectado.
    await this.garantirRegraNotificacao()
    const acao = permitido === null ? 'voltou ao padrão' : permitido ? 'foi liberado' : 'foi bloqueado';
    await this.alertas.disparar({
      categoria: CategoriaAlerta.OPERACIONAL,
      evento: 'PERMISSAO_ALTERADA',
      mensagem: `Permissão de "${recurso}" pro perfil ${perfil} ${acao}.`,
      contexto: { perfil, recurso, permitido, alteradoPor: usuarioId },
    })

    return { perfil, recurso, permitido }
  }

  private async garantirRegraNotificacao() {
    const existente = await this.prisma.regraAlerta.findFirst({ where: { evento: 'PERMISSAO_ALTERADA' } })
    if (!existente) {
      await this.prisma.regraAlerta.create({
        data: {
          categoria: CategoriaAlerta.OPERACIONAL,
          evento: 'PERMISSAO_ALTERADA',
          descricao: 'Override de permissão (RBAC) alterado por um Administrador',
          destinatariosPerfis: [Perfil.GESTOR_PRINCIPAL],
          canal: 'PAINEL',
        },
      })
    }
  }
}
