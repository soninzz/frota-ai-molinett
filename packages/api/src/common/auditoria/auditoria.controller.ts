import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { AuditoriaService } from './auditoria.service'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { RolesGuard } from '../guards/roles.guard'
import { Roles } from '../decorators/roles.decorator'
import { Perfil } from '@prisma/client'
import { Recurso } from '../decorators/recurso.decorator'

@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('auditoria')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private auditoria: AuditoriaService) {}

  // Trilha de auditoria por registro — ex: /auditoria/Lancamento/abc123
  @Get(':entidade/:registroId')
  @Roles(Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  historico(@Param('entidade') entidade: string, @Param('registroId') registroId: string) {
    return this.auditoria.historico(entidade, registroId)
  }
}
