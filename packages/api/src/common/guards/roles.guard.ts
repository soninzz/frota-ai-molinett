import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Perfil } from '@prisma/client'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { RECURSO_KEY } from '../decorators/recurso.decorator'
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

    const { user } = context.switchToHttp().getRequest()

    // RBAC editável (Administrador, sem deploy): se existe override explícito
    // pra esse perfil+recurso, ele manda — tanto pra liberar quanto pra negar.
    if (recurso) {
      const override = await this.prisma.regraPermissao.findUnique({
        where: { perfil_recurso: { perfil: user.perfil, recurso } },
      })
      if (override) {
        if (!override.permitido) throw new ForbiddenException('Acesso negado por regra de permissão configurada')
        return true
      }
    }

    if (!requiredRoles) return true

    if (!requiredRoles.includes(user.perfil)) {
      throw new ForbiddenException('Acesso negado para este perfil')
    }

    return true
  }
}