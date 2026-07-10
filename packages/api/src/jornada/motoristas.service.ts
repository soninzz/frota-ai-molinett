import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CriarMotoristaDto } from './dto/criar-motorista.dto'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class MotoristasService {
  constructor(private prisma: PrismaService) {}

  async listar() {
    return this.prisma.motorista.findMany({
      include: {
        usuario: { select: { nome: true, email: true, whatsappNumero: true, ativo: true } },
      },
      orderBy: { criadoEm: 'desc' },
    })
  }

  async criar(dto: CriarMotoristaDto) {
    const emailExistente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    })
    if (emailExistente) {
      throw new BadRequestException('Já existe um usuário com esse e-mail')
    }

    const cpfExistente = await this.prisma.motorista.findUnique({
      where: { cpf: dto.cpf },
    })
    if (cpfExistente) {
      throw new BadRequestException('Já existe um motorista com esse CPF')
    }

    // O motorista não faz login com e-mail/senha — interage pelo WhatsApp.
    // O Usuario é criado só porque o schema exige o vínculo (FK), com hash aleatório
    // que nunca será usado como credencial real.
    const senhaHash = await bcrypt.hash(require('crypto').randomBytes(24).toString('hex'), 10)

    const resultado = await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nome: dto.nome,
          email: dto.email,
          senhaHash,
          perfil: 'MOTORISTA',
          whatsappNumero: dto.whatsappNumero,
        },
      })

      const motorista = await tx.motorista.create({
        data: {
          usuarioId: usuario.id,
          cpf: dto.cpf,
          cnh: dto.cnh,
          cnhCategoria: dto.cnhCategoria,
          cnhVencimento: new Date(dto.cnhVencimento),
          toxicologicoVencimento: dto.toxicologicoVencimento
            ? new Date(dto.toxicologicoVencimento)
            : undefined,
          comissaoPct: dto.comissaoPct ?? 0,
        },
      })

      return { usuario, motorista }
    })

    return resultado.motorista
  }

  async painelJornada(motoristaId: string, dataInicio?: string, dataFim?: string) {
    const motorista = await this.prisma.motorista.findUnique({
      where: { id: motoristaId },
      include: { usuario: { select: { nome: true } } },
    })
    if (!motorista) throw new NotFoundException('Motorista não encontrado')

    const inicio = dataInicio ? new Date(dataInicio) : new Date(new Date().setDate(1))
    const fim = dataFim ? new Date(dataFim) : new Date()

    const viagens = await this.prisma.viagem.findMany({
      where: {
        motoristaId,
        criadoEm: { gte: inicio, lte: fim },
      },
      include: { horasExtra: true },
    })

    const totalViagens = viagens.length
    const totalKm = viagens.reduce((acc, v) => acc + (v.kmRodado ?? 0), 0)
    const totalHtMinutos = viagens.reduce((acc, v) => acc + (v.htMinutos ?? 0), 0)
    const totalHoraExtraMinutos = viagens.reduce(
      (acc, v) => acc + v.horasExtra.reduce((s, he) => s + he.minutos, 0),
      0,
    )

    const comissoes = await this.prisma.comissao.findMany({
      where: { motoristaId, criadoEm: { gte: inicio, lte: fim } },
    })

    const comissaoTotal = comissoes.reduce((acc, c) => acc + c.valor, 0)
    const comissaoPendente = comissoes.filter((c) => !c.pago).reduce((acc, c) => acc + c.valor, 0)

    return {
      motorista: { id: motorista.id, nome: motorista.usuario.nome, comissaoPct: motorista.comissaoPct },
      periodo: { inicio, fim },
      totalViagens,
      totalKm,
      totalHtHoras: +(totalHtMinutos / 60).toFixed(1),
      totalHoraExtraHoras: +(totalHoraExtraMinutos / 60).toFixed(1),
      comissaoTotal,
      comissaoPendente,
    }
  }
}