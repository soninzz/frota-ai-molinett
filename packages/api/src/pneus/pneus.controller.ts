import { Recurso } from '../common/decorators/recurso.decorator'
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { PneusService } from './pneus.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Perfil, TipoMovimentacaoPneu, PosicaoPneu } from '@prisma/client'
import { CriarPneuDto } from './dto/criar-pneu.dto'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('pneus')
@Controller('pneus')
export class PneusController {
  constructor(private pneusService: PneusService) {}
 
  @Get('veiculo/:veiculoId')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  listar(@Param('veiculoId') veiculoId: string) {
    return this.pneusService.listarPorVeiculo(veiculoId)
  }
 
  @Post(':id/movimentacao')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  registrar(
    @Param('id') id: string,
    @Body('tipo') tipo: TipoMovimentacaoPneu,
    @Body('veiculoId') veiculoId: string,
    @Body('kmAtual') kmAtual: number,
    @Body('posicaoDe') posicaoDe: PosicaoPneu,
    @Body('posicaoPara') posicaoPara: PosicaoPneu,
    @Body('valor') valor: number,
    @Body('fornecedor') fornecedor: string,
  ) {
    return this.pneusService.registrarMovimentacao(
      id, tipo, veiculoId, kmAtual, posicaoDe, posicaoPara, valor, fornecedor
    )
  }
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post()
  criar(@Body() dto: CriarPneuDto) {
    return this.pneusService.criar(dto)
  }
}