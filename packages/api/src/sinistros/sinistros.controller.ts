import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Perfil, StatusSinistro } from '@prisma/client'
import { SinistrosService } from './sinistros.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CriarSinistroDto } from './dto/criar-sinistro.dto'
import { AtualizarSinistroDto } from './dto/atualizar-sinistro.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sinistros')
export class SinistrosController {
  constructor(private sinistrosService: SinistrosService) {}

  @Get()
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.FINANCEIRO)
  listar(@Query('status') status?: StatusSinistro) {
    return this.sinistrosService.listar(status)
  }

  @Get('resumo')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.FINANCEIRO)
  resumo() {
    return this.sinistrosService.resumo()
  }

  @Get(':id')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.FINANCEIRO)
  buscarPorId(@Param('id') id: string) {
    return this.sinistrosService.buscarPorId(id)
  }

  @Post()
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  criar(@Body() dto: CriarSinistroDto) {
    return this.sinistrosService.criar(dto)
  }

  @Patch(':id')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  atualizar(@Param('id') id: string, @Body() dto: AtualizarSinistroDto) {
    return this.sinistrosService.atualizar(id, dto)
  }

  @Post(':id/eventos')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  adicionarEvento(@Param('id') id: string, @Body() body: { descricao: string }) {
    return this.sinistrosService.adicionarEvento(id, body.descricao)
  }
}
