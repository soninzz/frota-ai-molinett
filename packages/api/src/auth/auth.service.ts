import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../database/prisma.service'
import { LoginDto } from './dto/login.dto'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    })

    if (!user || !user.ativo) {
      throw new UnauthorizedException('Credenciais inválidas')
    }

    const senhaValida = await bcrypt.compare(dto.senha, user.senhaHash)
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas')
    }

    const payload = { sub: user.id, email: user.email, perfil: user.perfil }

    return {
      access_token: this.jwt.sign(payload),
      usuario: {
        id:     user.id,
        nome:   user.nome,
        email:  user.email,
        perfil: user.perfil,
      },
    }
  }

  async me(userId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id:     true,
        nome:   true,
        email:  true,
        perfil: true,
        ativo:  true,
      },
    })
  }
}