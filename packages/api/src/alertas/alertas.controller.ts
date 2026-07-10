import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common'
import { AlertasService } from './alertas.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Perfil } from '@prisma/client'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alertas')
export class AlertasController {
  constructor(private alertasService: AlertasService) {}
 
  @Get()
  listar() {
    return this.alertasService.listarRecentes()
  }
 
  @Get('regras')
  listarRegras() {
    return this.alertasService.listarRegras()
  }
 
  @Roles(Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('regras')
  criarRegra(
    @Body() dto: { categoria: string; evento: string; descricao: string; destinatariosPerfis: string[] },
  ) {
    return this.alertasService.criarRegra(dto)
  }
 
  @Roles(Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Patch('regras/:id')
  alternarRegra(@Param('id') id: string, @Body() body: { ativo: boolean }) {
    return this.alertasService.alternarRegra(id, body.ativo)
  }
}