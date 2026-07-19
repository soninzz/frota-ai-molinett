import { Recurso } from '../common/decorators/recurso.decorator'
import { Acao } from '../common/decorators/acao.decorator'
import {
  Controller, Get, Post, Patch, Body,
  Query, Param, UseGuards, Res
} from '@nestjs/common'
import type { Response } from 'express'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { FinanceiroService } from './financeiro.service'
import { FinanceiroMetasService } from './financeiro-metas.service'
import { CriarLancamentoDto, BaixarLancamentoDto } from './dto/lancamento.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Perfil } from '@prisma/client'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('financeiro')
@Controller('financeiro')
export class FinanceiroController {
  constructor(
    private financeiroService: FinanceiroService,
    private metasService:      FinanceiroMetasService,
  ) {}
 
  @Get('painel')
  @Acao('LER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  getPainel() {
    return this.financeiroService.getPainelFinanceiro()
  }

  @Post('conciliacao/ofx')
  @Acao('ESCREVER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  conciliarOfx(@Body('conteudoOfx') conteudoOfx: string, @Body('contaBancariaId') contaBancariaId: string) {
    return this.financeiroService.conciliarOfx(conteudoOfx, contaBancariaId)
  }
 
  @Get('fluxo-caixa')
  @Acao('LER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  getFluxoCaixa(@Query('dias') dias: string) {
    return this.financeiroService.getFluxoCaixa(Number(dias) || 90)
  }
 
  @Get('dre')
  @Acao('LER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  getDre(@Query('mes') mes: string) {
    const mesAtual = mes || new Date().toISOString().slice(0, 7)
    return this.financeiroService.getDre(mesAtual)
  }
 
  @Post('lancamentos')
  @Acao('ESCREVER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  criarLancamento(@Body() dto: CriarLancamentoDto, @CurrentUser() user: any) {
    return this.financeiroService.criarLancamento(dto, user.id)
  }
 
  @Get('lancamentos')
  @Acao('LER')
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
  @Acao('LER')
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
  @Acao('LER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  getAtrasados() {
    return this.financeiroService.getAtrasados()
  }
 
  @Patch('lancamentos/baixar')
  @Acao('ESCREVER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  baixar(@Body() dto: BaixarLancamentoDto, @CurrentUser() user: any) {
    return this.financeiroService.baixarLancamento(dto, user.id)
  }

  @Patch('lancamentos/:id/reagendar')
  @Acao('ESCREVER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  reagendar(@Param('id') id: string, @CurrentUser() user: any) {
    return this.financeiroService.reagendarLancamento(id, user.id)
  }
 
  @Get('metas')
  @Acao('LER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.ATENDIMENTO)
  getMetas() {
    return this.metasService.getMetas()
  }
 
  @Post('metas/recalcular')
  @Acao('ESCREVER')
  @Roles(Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  recalcularMetas() {
    return this.metasService.recalcularMetas()
  }

  // Guardrail 4: gestor só pode AUMENTAR a meta acima do piso calculado
  @Patch('metas/ajustar')
  @Acao('ESCREVER')
  @Roles(Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  ajustarMetas(
    @Body('faturamentoMinimoManual') faturamentoMinimoManual: number | undefined,
    @Body('kmMaximoManual') kmMaximoManual: number | undefined,
    @CurrentUser() user: any,
  ) {
    return this.metasService.ajustarManualmente(user.id, faturamentoMinimoManual, kmMaximoManual)
  }
 
  @Post('simulador')
  @Acao('ESCREVER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  simular(
    @Body('valorTotal') valorTotal: number,
    @Body('parcelas')   parcelas:   number,
    @Body('taxaMensal') taxaMensal: number,
  ) {
    return this.financeiroService.simularFinanciamento(valorTotal, parcelas, taxaMensal)
  }
 
  @Post('comparador')
  @Acao('ESCREVER')
  @Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  comparar(
    @Body('valor')    valor:    number,
    @Body('cenarios') cenarios: { nome: string; retornoMensal: number; prazoMeses: number }[],
  ) {
    return this.financeiroService.compararCenarios(valor, cenarios)
  }
}