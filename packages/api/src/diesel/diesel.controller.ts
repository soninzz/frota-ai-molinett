import { Recurso } from '../common/decorators/recurso.decorator'
import { Acao } from '../common/decorators/acao.decorator'
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { DieselService } from './diesel.service'
import { RegistrarAbastecimentoDto } from './dto/abastecimento.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Perfil } from '@prisma/client'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('diesel')
@Controller('diesel')
export class DieselController {
  constructor(private dieselService: DieselService) {}
 
  @Post('abastecimentos')
  @Acao('ESCREVER')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.MOTORISTA, Perfil.OPERACIONAL)
  registrar(@Body() dto: RegistrarAbastecimentoDto) {
    return this.dieselService.registrarAbastecimento(dto)
  }
 
  @Get('abastecimentos/:veiculoId')
  @Acao('LER')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.OPERACIONAL)
  getHistorico(@Param('veiculoId') veiculoId: string, @Query('limite') limite: string) {
    return this.dieselService.getHistorico(veiculoId, Number(limite) || 20)
  }
 
  @Get('media/:veiculoId')
  @Acao('LER')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  getMedia(@Param('veiculoId') veiculoId: string) {
    return this.dieselService.getMediaConsumo(veiculoId)
  }
 
  @Get('pendentes-cupom')
  @Acao('LER')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  getPendentes() {
    return this.dieselService.getPendentesCupom()
  }

  @Get('sugestao-postos')
  @Acao('LER')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.MOTORISTA, Perfil.OPERACIONAL)
  sugerirPostos(@Query('meses') meses: string, @Query('veiculoId') veiculoId?: string) {
    return this.dieselService.sugerirPostos(Number(meses) || 6, veiculoId)
  }
}