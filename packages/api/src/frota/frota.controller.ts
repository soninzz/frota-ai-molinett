import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { FrotaService } from './frota.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Perfil } from '@prisma/client'
import { CriarVeiculoDto } from './dto/criar-veiculo.dto'
import { Post, Body } from '@nestjs/common'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('frota')
export class FrotaController {
  constructor(private frotaService: FrotaService) {}
 
  @Get('painel')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.OPERACIONAL)
  getPainel() {
    return this.frotaService.getPainelPrincipal()
  }
 
  @Get('veiculos')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.ATENDIMENTO, Perfil.OPERACIONAL)
  listar() {
    return this.frotaService.listarVeiculos()
  }
 
  @Get('veiculos/:id')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.OPERACIONAL)
  findById(@Param('id') id: string) {
    return this.frotaService.findById(id)
  }
 
  @Get('veiculos/:id/custo-km')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  calcularCustoKm(@Param('id') id: string) {
    return this.frotaService.calcularCustoKmReal(id)
  }
  @Roles(Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.GESTOR_MANUTENCAO)
  @Post('veiculos')
  criar(@Body() dto: CriarVeiculoDto) {
    return this.frotaService.criar(dto)
  }
}