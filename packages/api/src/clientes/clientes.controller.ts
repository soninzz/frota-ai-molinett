import { Recurso } from '../common/decorators/recurso.decorator'
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ClientesService } from './clientes.service'
import { CriarClienteDto } from './dto/criar-cliente.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Perfil } from '@prisma/client'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('clientes')
@Controller('clientes')
export class ClientesController {
  constructor(private clientesService: ClientesService) {}
 
  @Get()
  listar() {
    return this.clientesService.listar()
  }
 
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.clientesService.buscarPorId(id)
  }
 
  @Roles(Perfil.ATENDIMENTO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post()
  criar(@Body() dto: CriarClienteDto) {
    return this.clientesService.criar(dto)
  }
}