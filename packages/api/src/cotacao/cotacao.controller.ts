import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common'
import { CotacaoService } from './cotacao.service'
import { CriarCotacaoDto } from './dto/criar-cotacao.dto'
import { ConfirmarCotacaoDto } from './dto/confirmar-cotacao.dto'
import { AlterarOsDto } from './dto/alterar-os.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Perfil } from '@prisma/client'
 import { AprovarCotacaoDto } from './dto/aprovar-cotacao.dto'
 
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cotacoes')
export class CotacaoController {
  constructor(private cotacaoService: CotacaoService) {}
 
  // Calcula os 5 cenários de margem
  @Post('calcular')
  @Roles(Perfil.ATENDIMENTO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  calcular(@Body() dto: CriarCotacaoDto, @CurrentUser() user: any) {
    return this.cotacaoService.calcular(dto, user.id)
  }
 
  // Confirma e gera OS
  @Post('confirmar')
  @Roles(Perfil.ATENDIMENTO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  confirmar(@Body() dto: ConfirmarCotacaoDto, @CurrentUser() user: any) {
    return this.cotacaoService.confirmar(dto, user.id)
  }
 
  // Painel de metas para o atendimento
  @Get('painel-metas')
  @Roles(Perfil.ATENDIMENTO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.FINANCEIRO)
  getPainelMetas() {
    return this.cotacaoService.getPainelMetas()
  }
 
  // Lista histórico
  @Get()
  @Roles(Perfil.ATENDIMENTO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.FINANCEIRO)
  listar(@Query('pagina') pagina: string, @Query('limite') limite: string) {
    return this.cotacaoService.listar(Number(pagina) || 1, Number(limite) || 20)
  }

  @Get('pendentes-aprovacao')
  listarPendentesAprovacao() {
    return this.cotacaoService.listarPendentesAprovacao()
  }
 
  // Detalhe de uma cotação
  @Get(':id')
  @Roles(Perfil.ATENDIMENTO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.FINANCEIRO)
  findById(@Param('id') id: string) {
    return this.cotacaoService.findById(id)
  }
 
  // Cancela cotação
  @Delete(':id')
  @Roles(Perfil.ATENDIMENTO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  cancelar(@Param('id') id: string, @Body('motivo') motivo: string) {
    return this.cotacaoService.cancelar(id, motivo)
  }
 
  // Solicita alteração de OS
  @Post('os/alterar')
  @Roles(Perfil.ATENDIMENTO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  solicitarAlteracao(@Body() dto: AlterarOsDto, @CurrentUser() user: any) {
    return this.cotacaoService.solicitarAlteracaoOs(dto, user.id)
  }
  @Get('os/:id')
  buscarOs(@Param('id') id: string) {
    return this.cotacaoService.buscarOsPorId(id)
  }

  @Roles(Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post(':id/aprovar')
  aprovar(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: AprovarCotacaoDto,
  ) {
    return this.cotacaoService.aprovarPeloGestor(id, user.id, dto)
  }
}
