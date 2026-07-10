import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ManutencaoService } from './manutencao.service'
import { CriarOsManutencaoDto, AtualizarStatusOsDto } from './dto/manutencao.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Perfil } from '@prisma/client'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('manutencao')
export class ManutencaoController {
  constructor(private manutencaoService: ManutencaoService) {}
 
  @Post('os')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.OPERACIONAL)
  criarOs(@Body() dto: CriarOsManutencaoDto, @CurrentUser() user: any) {
    return this.manutencaoService.criarOs(dto, user.id)
  }
 
  @Get('os')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.OPERACIONAL)
  listar(@Query('veiculoId') veiculoId: string, @Query('status') status: string) {
    return this.manutencaoService.listar(veiculoId, status)
  }
 
  @Patch('os/:id/status')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  atualizarStatus(@Param('id') id: string, @Body() dto: AtualizarStatusOsDto) {
    return this.manutencaoService.atualizarStatus(id, dto)
  }
 
  @Get('veiculos/:id/revisoes')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.OPERACIONAL)
  getRevisoes(@Param('id') id: string) {
    return this.manutencaoService.getRevisoes(id)
  }
 
  @Post('revisoes/:id/trocar')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  registrarTroca(
    @Param('id') id: string,
    @Body('kmAtual') kmAtual: number,
    @Body('fornecedor') fornecedor: string,
    @Body('valor') valor: number,
  ) {
    return this.manutencaoService.registrarTrocaItem(id, kmAtual, fornecedor, valor)
  }
 
  @Get('veiculos/:id/preditiva')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  analisePreditiva(@Param('id') id: string) {
    return this.manutencaoService.analisePreditiva(id)
  }
}