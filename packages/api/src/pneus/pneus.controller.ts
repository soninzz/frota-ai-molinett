import { Recurso } from '../common/decorators/recurso.decorator'
import { Acao } from '../common/decorators/acao.decorator'
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { PneusService } from './pneus.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Perfil, TipoMovimentacaoPneu, PosicaoPneu } from '@prisma/client'
import { CriarPneuDto } from './dto/criar-pneu.dto'
import { CurrentUser } from '../common/decorators/current-user.decorator'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('pneus')
@Controller('pneus')
export class PneusController {
  constructor(private pneusService: PneusService) {}
 
  @Get('veiculo/:veiculoId')
  @Acao('LER')
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  listar(@Param('veiculoId') veiculoId: string) {
    return this.pneusService.listarPorVeiculo(veiculoId)
  }
 
  @Post(':id/movimentacao')
  @Acao('ESCREVER')
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
    @CurrentUser() user: any,
  ) {
    return this.pneusService.registrarMovimentacao(
      id, tipo, veiculoId, kmAtual, posicaoDe, posicaoPara, valor, fornecedor, user.id
    )
  }
  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post()
  @Acao('ESCREVER')
  criar(@Body() dto: CriarPneuDto, @CurrentUser() user: any) {
    return this.pneusService.criar(dto, user.id)
  }
}