import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { Perfil } from '@prisma/client'
import { EstoqueService } from './estoque.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Recurso } from '../common/decorators/recurso.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('estoque')
@Controller('estoque')
export class EstoqueController {
  constructor(private estoque: EstoqueService) {}

  @Get()
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  listar() {
    return this.estoque.listar()
  }

  @Get('abaixo-minimo')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  abaixoDoMinimo() {
    return this.estoque.itensAbaixoDoMinimo()
  }

  @Get('cruzamento-orcamento')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.FINANCEIRO)
  cruzamentoOrcamento() {
    return this.estoque.cruzamentoOrcamento()
  }

  @Post()
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  criar(
    @Body()
    dto: {
      nome: string
      codigo?: string
      categoria?: string
      quantidadeAtual?: number
      quantidadeMinima?: number
      unidade?: string
      fornecedorPref?: string
      valorMedio?: number
      localizacao?: string
    },
    @CurrentUser() user: any,
  ) {
    return this.estoque.criar(dto, user.id)
  }

  @Post('movimentacao')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  registrarMovimentacao(
    @Body()
    dto: {
      itemId: string
      tipo: 'ENTRADA' | 'SAIDA'
      quantidade: number
      motivo?: string
      veiculoId?: string
      valor?: number
    },
    @CurrentUser() user: any,
  ) {
    return this.estoque.registrarMovimentacao(dto, user.id)
  }
}
