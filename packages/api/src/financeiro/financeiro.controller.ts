import {
  Controller, Get, Post, Patch, Body,
  Query, Param, UseGuards, Res
} from '@nestjs/common'
import type { Response } from 'express'
import { FinanceiroService } from './financeiro.service'
import { FinanceiroMetasService } from './financeiro-metas.service'
import { CriarLancamentoDto, BaixarLancamentoDto } from './dto/lancamento.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Perfil } from '@prisma/client'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('financeiro')
export class FinanceiroController {
  constructor(
    private financeiroService: FinanceiroService,
    private metasService:      FinanceiroMetasService,
  ) {}
 
  @Get('painel')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  getPainel() {
    return this.financeiroService.getPainelFinanceiro()
  }
 
  @Get('fluxo-caixa')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  getFluxoCaixa(@Query('dias') dias: string) {
    return this.financeiroService.getFluxoCaixa(Number(dias) || 90)
  }
 
  @Get('dre')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  getDre(@Query('mes') mes: string) {
    const mesAtual = mes || new Date().toISOString().slice(0, 7)
    return this.financeiroService.getDre(mesAtual)
  }
 
  @Post('lancamentos')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  criarLancamento(@Body() dto: CriarLancamentoDto) {
    return this.financeiroService.criarLancamento(dto)
  }
 
  @Get('lancamentos')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  listar(
    @Query('tipo')   tipo:   string,
    @Query('status') status: string,
    @Query('pagina') pagina: string,
    @Query('limite') limite: string,
  ) {
    return this.financeiroService.listarLancamentos(tipo, status, Number(pagina) || 1, Number(limite) || 20)
  }
 
  @Get('lancamentos/exportar')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  async exportar(
    @Query('tipo')   tipo:   string,
    @Query('status') status: string,
    @Res()           res:    Response,
  ) {
    const csv = await this.financeiroService.exportarLancamentosCsv(tipo, status)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="lancamentos-${new Date().toISOString().slice(0, 10)}.csv"`)
    res.send(csv)
  }

  @Get('lancamentos/atrasados')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  getAtrasados() {
    return this.financeiroService.getAtrasados()
  }
 
  @Patch('lancamentos/baixar')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  baixar(@Body() dto: BaixarLancamentoDto) {
    return this.financeiroService.baixarLancamento(dto)
  }
 
  @Patch('lancamentos/:id/reagendar')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  reagendar(@Param('id') id: string) {
    return this.financeiroService.reagendarLancamento(id)
  }
 
  @Get('metas')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.ATENDIMENTO)
  getMetas() {
    return this.metasService.getMetas()
  }
 
  @Post('metas/recalcular')
  @Roles(Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  recalcularMetas() {
    return this.metasService.recalcularMetas()
  }
 
  @Post('simulador')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  simular(
    @Body('valorTotal') valorTotal: number,
    @Body('parcelas')   parcelas:   number,
    @Body('taxaMensal') taxaMensal: number,
  ) {
    return this.financeiroService.simularFinanciamento(valorTotal, parcelas, taxaMensal)
  }
 
  @Post('comparador')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  comparar(
    @Body('valor')    valor:    number,
    @Body('cenarios') cenarios: { nome: string; retornoMensal: number; prazoMeses: number }[],
  ) {
    return this.financeiroService.compararCenarios(valor, cenarios)
  }
}