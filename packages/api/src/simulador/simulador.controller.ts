import { Recurso } from '../common/decorators/recurso.decorator'
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { Perfil } from '@prisma/client'
import { SimuladorService } from './simulador.service'
import { MercadoService } from './mercado.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { SimularDto, CriarCenarioDto } from './dto/simular.dto'
import { SimularFinanciamentoDto, CompararCenariosDto } from './dto/financiamento.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('simulador')
@Roles(Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
@Controller('simulador')
export class SimuladorController {
  constructor(
    private simuladorService: SimuladorService,
    private mercadoService: MercadoService,
  ) {}

  @Get('baseline')
  baseline() {
    return this.simuladorService.baseline()
  }

  @Get('taxas')
  taxas() {
    return this.mercadoService.taxas()
  }

  @Post('financiamento')
  simularFinanciamento(@Body() dto: SimularFinanciamentoDto) {
    return this.simuladorService.simularFinanciamento(dto)
  }

  @Post('comparar-investimento')
  compararInvestimento(@Body() dto: CompararCenariosDto) {
    return this.simuladorService.compararCenariosInvestimento(dto)
  }

  @Post('simular')
  simular(@Body() dto: SimularDto) {
    return this.simuladorService.simular(dto)
  }

  @Get('cenarios')
  listarCenarios() {
    return this.simuladorService.listarCenarios()
  }

  @Post('cenarios')
  criarCenario(@Body() dto: CriarCenarioDto) {
    return this.simuladorService.criarCenario(dto)
  }

  @Delete('cenarios/:id')
  excluirCenario(@Param('id') id: string) {
    return this.simuladorService.excluirCenario(id)
  }

  @Get('comparar')
  comparar(@Query('ids') ids: string) {
    return this.simuladorService.comparar((ids ?? '').split(',').filter(Boolean))
  }
}
