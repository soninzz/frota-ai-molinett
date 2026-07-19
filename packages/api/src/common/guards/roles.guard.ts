import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AcaoPermissao, Perfil } from '@prisma/client'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { RECURSO_KEY } from '../decorators/recurso.decorator'
import { ACAO_KEY } from '../decorators/acao.decorator'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Perfil[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const recurso = this.reflector.getAllAndOverride<string>(RECURSO_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const acao = this.reflector.getAllAndOverride<AcaoPermissao>(ACAO_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    const { user } = context.switchToHttp().getRequest()

    // RBAC editável (Administrador, sem deploy): se existe override explícito
    // pra esse perfil+recurso, ele manda — tanto pra liberar quanto pra negar.
    // Isso continua exatamente como sempre foi (bloqueio/liberação do
    // recurso inteiro, todos os verbos).
    if (recurso) {
      const override = await this.prisma.regraPermissao.findUnique({
        where: { perfil_recurso: { perfil: user.perfil, recurso } },
      })
      if (override) {
        if (!override.permitido) throw new ForbiddenException('Acesso negado por regra de permissão configurada')
        return true
      }
    }

    // Camada ADITIVA e opcional: só entra em jogo se a rota tiver @Acao() E
    // existir override granular específico pra perfil+recurso+ação — não
    // muda nada do comportamento em rotas sem @Acao().
    if (recurso && acao) {
      const overrideAcao = await this.prisma.regraPermissaoAcao.findUnique({
        where: { perfil_recurso_acao: { perfil: user.perfil, recurso, acao } },
      })
      if (overrideAcao && !overrideAcao.permitido) {
        throw new ForbiddenException(`Acesso negado — perfil sem permissão de "${acao.toLowerCase()}" em "${recurso}"`)
      }
    }

    if (!requiredRoles) return true

    if (!requiredRoles.includes(user.perfil)) {
      throw new ForbiddenException('Acesso negado para este perfil')
    }

    return true
  }
}