import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.authService.me(user.id)
  }

  // LGPD art. 18/19 — qualquer usuário pode exportar os próprios dados
  @UseGuards(JwtAuthGuard)
  @Get('me/dados')
  exportarMeusDados(@CurrentUser() user: any) {
    return this.authService.exportarMeusDados(user.id)
  }
}