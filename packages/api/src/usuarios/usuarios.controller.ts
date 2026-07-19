import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { Perfil } from '@prisma/client'
import { UsuariosService } from './usuarios.service'
import { CriarUsuarioDto } from './dto/criar-usuario.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Recurso } from '../common/decorators/recurso.decorator'
import { Acao } from '../common/decorators/acao.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'

// Só o Administrador gerencia a equipe — criar conta, desativar (offboarding),
// resetar senha. Sem tela pra isso, cada colaborador novo dependia de rodar
// script direto no banco.
@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private usuarios: UsuariosService) {}

  @Get()
  @Acao('LER')
  @Roles(Perfil.ADMINISTRADOR)
  listar() {
    return this.usuarios.listar()
  }

  @Post()
  @Acao('CONFIGURAR')
  @Roles(Perfil.ADMINISTRADOR)
  criar(@Body() dto: CriarUsuarioDto, @CurrentUser() user: any) {
    return this.usuarios.criar(dto, user.id)
  }

  @Patch(':id/ativo')
  @Acao('CONFIGURAR')
  @Roles(Perfil.ADMINISTRADOR)
  alternarAtivo(@Param('id') id: string, @Body('ativo') ativo: boolean, @CurrentUser() user: any) {
    return this.usuarios.alternarAtivo(id, ativo, user.id)
  }

  @Post(':id/resetar-senha')
  @Acao('CONFIGURAR')
  @Roles(Perfil.ADMINISTRADOR)
  resetarSenha(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usuarios.resetarSenha(id, user.id)
  }
}
