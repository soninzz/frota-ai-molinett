import { Recurso } from '../common/decorators/recurso.decorator'
import { Acao } from '../common/decorators/acao.decorator'
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Perfil, StatusSinistro } from '@prisma/client'
import { SinistrosService } from './sinistros.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CriarSinistroDto } from './dto/criar-sinistro.dto'
import { AtualizarSinistroDto } from './dto/atualizar-sinistro.dto'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('sinistros')
@Controller('sinistros')
export class SinistrosController {
  constructor(private sinistrosService: SinistrosService) {}

  @Get()
  @Acao('LER')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.FINANCEIRO)
  listar(@Query('status') status?: StatusSinistro) {
    return this.sinistrosService.listar(status)
  }

  @Get('resumo')
  @Acao('LER')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.FINANCEIRO)
  resumo() {
    return this.sinistrosService.resumo()
  }

  @Get(':id')
  @Acao('LER')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.FINANCEIRO)
  buscarPorId(@Param('id') id: string) {
    return this.sinistrosService.buscarPorId(id)
  }

  @Post()
  @Acao('ESCREVER')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  criar(@Body() dto: CriarSinistroDto, @CurrentUser() user: any) {
    return this.sinistrosService.criar(dto, user.id)
  }

  @Patch(':id')
  @Acao('ESCREVER')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  atualizar(@Param('id') id: string, @Body() dto: AtualizarSinistroDto, @CurrentUser() user: any) {
    return this.sinistrosService.atualizar(id, dto, user.id)
  }

  @Post(':id/eventos')
  @Acao('ESCREVER')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  adicionarEvento(@Param('id') id: string, @Body() body: { descricao: string }, @CurrentUser() user: any) {
    return this.sinistrosService.adicionarEvento(id, body.descricao, user.id)
  }
}
