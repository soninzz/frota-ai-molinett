import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../database/prisma.service'
import { LoginDto } from './dto/login.dto'
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

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

  // Direito de correção (LGPD art. 18, III) — só campos de contato, que são
  // autodeclarados. Nome/documento de identidade (CPF/CNH) fica com o
  // Gestor/Administrador porque são dado verificado, não autodeclarado.
  async corrigirMeusDados(userId: string, dados: { nome?: string; whatsappNumero?: string }) {
    if (!dados.nome && !dados.whatsappNumero) {
      throw new BadRequestException('Informe ao menos um campo pra corrigir')
    }
    return this.prisma.usuario.update({
      where: { id: userId },
      data: {
        ...(dados.nome && { nome: dados.nome }),
        ...(dados.whatsappNumero !== undefined && { whatsappNumero: dados.whatsappNumero }),
      },
      select: { id: true, nome: true, email: true, whatsappNumero: true },
    })
  }

  // Direito de eliminação (LGPD art. 18, VI) — anonimiza em vez de apagar
  // linha: o usuário tem histórico com FK em cotações/viagens/comissões que
  // precisa ser preservado por obrigação legal/contábil (art. 16, I e II —
  // cumprimento de obrigação legal e uso pela administração pública/estudo).
  // CPF/CNH do Motorista NÃO são apagados pelo mesmo motivo (registro
  // trabalhista) — só os dados de contato/identificação direta.
  async eliminarMeusDados(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: userId } })
    if (!usuario) throw new BadRequestException('Usuário não encontrado')

    const senhaAleatoria = await bcrypt.hash(randomBytes(32).toString('hex'), 10)

    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        nome: 'Usuário removido (LGPD)',
        email: `removido-${userId}@anonimizado.local`,
        whatsappNumero: null,
        senhaHash: senhaAleatoria,
        ativo: false,
      },
    })

    return {
      eliminadoEm: new Date().toISOString(),
      observacao:
        'Dados de contato/identificação anonimizados. CPF/CNH (se motorista) e histórico ' +
        'de operações preservados por obrigação legal (LGPD art. 16, I) — registro ' +
        'trabalhista e contábil não pode ser eliminado enquanto a obrigação vigorar.',
    }
  }
}