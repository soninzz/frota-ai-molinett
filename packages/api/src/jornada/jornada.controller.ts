import {
  Controller, Post, Get, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common'
import { ViagensService } from './viagens.service'
import { MotoristasService } from './motoristas.service'
import { ComissoesService } from './comissoes.service'
import { LeiMotoristaService } from './lei-motorista.service'
import { IniciarViagemDto } from './dto/iniciar-viagem.dto'
import { FinalizarViagemDto } from './dto/finalizar-viagem.dto'
import { CriarHoraExtraDto } from './dto/hora-extra.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Perfil } from '@prisma/client'
import { CriarMotoristaDto } from './dto/criar-motorista.dto'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class JornadaController {
  constructor(
    private viagensService: ViagensService,
    private motoristasService: MotoristasService,
    private comissoesService: ComissoesService,
    private leiMotoristaService: LeiMotoristaService,
  ) {}

  // ── Lei do Motorista (13.103/2015) ──
  @Get('jornada/lei-motorista')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  relatorioLeiMotorista(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.leiMotoristaService.relatorio(dataInicio, dataFim)
  }

  @Get('jornada/lei-motorista/verificar/:motoristaId')
  @Roles(Perfil.ATENDIMENTO, Perfil.OPERACIONAL, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  verificarDisponibilidade(@Param('motoristaId') motoristaId: string) {
    return this.leiMotoristaService.verificarDisponibilidade(motoristaId)
  }

  @Get('jornada/horas-extra/por-classe')
  @Roles(Perfil.OPERACIONAL, Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  horasExtraPorClasse(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.leiMotoristaService.horasExtraPorClasse(dataInicio, dataFim)
  }
 
  // ── Motoristas ──
  @Get('motoristas')
  listarMotoristas() {
    return this.motoristasService.listar()
  }
 
  @Get('motoristas/:id/jornada')
  painelJornada(
    @Param('id') id: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.motoristasService.painelJornada(id, dataInicio, dataFim)
  }
 
  // ── Viagens ──
  @Roles(Perfil.OPERACIONAL, Perfil.MOTORISTA, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('viagens/iniciar')
  iniciar(@Body() dto: IniciarViagemDto) {
    return this.viagensService.iniciar(dto)
  }
 
  @Roles(Perfil.OPERACIONAL, Perfil.MOTORISTA, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('viagens/:id/finalizar')
  finalizar(@Param('id') id: string, @Body() dto: FinalizarViagemDto) {
    return this.viagensService.finalizar(id, dto)
  }
 
  @Get('viagens')
  listarViagens(
    @Query('motoristaId') motoristaId?: string,
    @Query('veiculoId') veiculoId?: string,
  ) {
    return this.viagensService.listar({ motoristaId, veiculoId })
  }
 
  @Get('viagens/:id')
  detalheViagem(@Param('id') id: string) {
    return this.viagensService.detalhe(id)
  }
 
  @Post('viagens/:id/horas-extra')
  adicionarHoraExtra(@Param('id') id: string, @Body() dto: CriarHoraExtraDto) {
    return this.viagensService.adicionarHoraExtra(id, dto)
  }
 
  // ── Comissões ──
  @Get('comissoes')
  listarComissoes(
    @Query('motoristaId') motoristaId?: string,
    @Query('pago') pago?: string,
  ) {
    const pagoBool = pago === undefined ? undefined : pago === 'true'
    return this.comissoesService.listar({ motoristaId, pago: pagoBool })
  }
 
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Patch('comissoes/:id/pagar')
  pagarComissao(@Param('id') id: string) {
    return this.comissoesService.pagar(id)
  }

  @Roles(Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('motoristas')
  criarMotorista(@Body() dto: CriarMotoristaDto) {
    return this.motoristasService.criar(dto)
  }
}