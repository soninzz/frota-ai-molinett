import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { Perfil } from '@prisma/client'
import { PermissoesService } from './permissoes.service'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { RolesGuard } from '../guards/roles.guard'
import { Roles } from '../decorators/roles.decorator'
import { CurrentUser } from '../decorators/current-user.decorator'

// Só o Administrador edita RBAC — e só aqui, sem precisar de deploy.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sistema/permissoes')
export class PermissoesController {
  constructor(private permissoes: PermissoesService) {}

  @Get()
  @Roles(Perfil.ADMINISTRADOR)
  matriz() {
    return this.permissoes.matriz()
  }

  @Patch()
  @Roles(Perfil.ADMINISTRADOR)
  definir(
    @Body('perfil') perfil: Perfil,
    @Body('recurso') recurso: string,
    @Body('permitido') permitido: boolean | null,
    @CurrentUser() user: any,
  ) {
    return this.permissoes.definirOverride(perfil, recurso, permitido, user.id)
  }
}
