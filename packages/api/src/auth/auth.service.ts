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

  // Direito de acesso (LGPD art. 18, I + art. 19 — prazo de 15 dias) —
  // exporta todo dado pessoal que o sistema guarda sobre o usuário logado,
  // incluindo o vínculo de Motorista (CPF/CNH/GPS via viagens) quando existir.
  async exportarMeusDados(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        whatsappNumero: true,
        perfil: true,
        ativo: true,
        criadoEm: true,
      },
    })

    const motorista = await this.prisma.motorista.findUnique({
      where: { usuarioId: userId },
      select: {
        id: true,
        cpf: true,
        cnh: true,
        cnhCategoria: true,
        cnhVencimento: true,
        toxicologicoVencimento: true,
        mopp: true,
        moppVencimento: true,
        nr20: true,
        nr20Vencimento: true,
        comissaoPct: true,
        viagens: {
          select: { id: true, iniciadaEm: true, concluidaEm: true, kmRodado: true },
          orderBy: { criadoEm: 'desc' },
          take: 100,
        },
      },
    })

    return {
      geradoEm: new Date().toISOString(),
      baseLegal: {
        dadosCadastrais: 'Execução de contrato de trabalho/prestação de serviço (LGPD art. 7º, V)',
        gpsDeViagens: motorista ? 'Legítimo interesse do controlador, com LIA (LGPD art. 7º, IX)' : null,
      },
      usuario,
      motorista,
    }
  }
}