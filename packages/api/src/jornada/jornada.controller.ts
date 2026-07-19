import { Recurso } from '../common/decorators/recurso.decorator'
import { Acao } from '../common/decorators/acao.decorator'
import {
  Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Res,
} from '@nestjs/common'
import type { Response } from 'express'
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
import { CurrentUser } from '../common/decorators/current-user.decorator'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('jornada')
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
  @Acao('LER')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  relatorioLeiMotorista(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.leiMotoristaService.relatorio(dataInicio, dataFim)
  }

  @Get('jornada/lei-motorista/verificar/:motoristaId')
  @Acao('LER')
  @Roles(Perfil.ATENDIMENTO, Perfil.OPERACIONAL, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  verificarDisponibilidade(@Param('motoristaId') motoristaId: string) {
    return this.leiMotoristaService.verificarDisponibilidade(motoristaId)
  }

  @Get('jornada/horas-extra/por-classe')
  @Acao('LER')
  @Roles(Perfil.OPERACIONAL, Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  horasExtraPorClasse(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.leiMotoristaService.horasExtraPorClasse(dataInicio, dataFim)
  }

  // Exportação em massa (CSV) fica de fora do OPERACIONAL de propósito —
  // guardrail dos critérios de sucesso: "exportação em massa bloqueada p/
  // perfis operacionais". A consulta normal (por-classe, acima) continua
  // liberada pra esse perfil, só o download em lote é que é restrito.
  @Get('jornada/horas-extra/exportar')
  @Acao('LER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  async exportarHorasExtra(
    @Query('dataInicio') dataInicio: string | undefined,
    @Query('dataFim')    dataFim:    string | undefined,
    @Res()                res:        Response,
  ) {
    const csv = await this.leiMotoristaService.horasExtraPorClasseCsv(dataInicio, dataFim)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="horas-extra-${new Date().toISOString().slice(0, 10)}.csv"`)
    res.send(csv)
  }

  // ── Motoristas ──
  @Get('motoristas')
  @Acao('LER')
  listarMotoristas() {
    return this.motoristasService.listar()
  }
 
  @Get('motoristas/:id/jornada')
  @Acao('LER')
  painelJornada(
    @Param('id') id: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.motoristasService.painelJornada(id, dataInicio, dataFim)
  }

  @Get('motoristas/comparativo')
  @Acao('LER')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  comparativoMotoristas(@Query('dataInicio') dataInicio?: string, @Query('dataFim') dataFim?: string) {
    return this.motoristasService.comparativoMotoristas(dataInicio, dataFim)
  }

  // ── Viagens ──
  @Roles(Perfil.OPERACIONAL, Perfil.MOTORISTA, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('viagens/iniciar')
  @Acao('ESCREVER')
  iniciar(@Body() dto: IniciarViagemDto, @CurrentUser() user: any) {
    return this.viagensService.iniciar(dto, user.id)
  }

  @Roles(Perfil.OPERACIONAL, Perfil.MOTORISTA, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('viagens/:id/finalizar')
  @Acao('ESCREVER')
  finalizar(@Param('id') id: string, @Body() dto: FinalizarViagemDto, @CurrentUser() user: any) {
    return this.viagensService.finalizar(id, dto, user.id)
  }
 
  @Get('viagens')
  @Acao('LER')
  listarViagens(
    @Query('motoristaId') motoristaId?: string,
    @Query('veiculoId') veiculoId?: string,
  ) {
    return this.viagensService.listar({ motoristaId, veiculoId })
  }
 
  @Get('viagens/:id')
  @Acao('LER')
  detalheViagem(@Param('id') id: string) {
    return this.viagensService.detalhe(id)
  }
 
  @Post('viagens/:id/horas-extra')
  @Acao('ESCREVER')
  adicionarHoraExtra(@Param('id') id: string, @Body() dto: CriarHoraExtraDto, @CurrentUser() user: any) {
    return this.viagensService.adicionarHoraExtra(id, dto, user.id)
  }
 
  // ── Comissões ──
  @Get('comissoes')
  @Acao('LER')
  listarComissoes(
    @Query('motoristaId') motoristaId?: string,
    @Query('pago') pago?: string,
  ) {
    const pagoBool = pago === undefined ? undefined : pago === 'true'
    return this.comissoesService.listar({ motoristaId, pago: pagoBool })
  }
 
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Patch('comissoes/:id/pagar')
  @Acao('ESCREVER')
  pagarComissao(@Param('id') id: string, @CurrentUser() user: any) {
    return this.comissoesService.pagar(id, user.id)
  }

  @Roles(Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('motoristas')
  @Acao('ESCREVER')
  criarMotorista(@Body() dto: CriarMotoristaDto, @CurrentUser() user: any) {
    return this.motoristasService.criar(dto, user.id)
  }
}