import { Injectable, NotFoundException } from '@nestjs/common'
import { StatusSinistro } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { CriarSinistroDto } from './dto/criar-sinistro.dto'
import { AtualizarSinistroDto } from './dto/atualizar-sinistro.dto'

@Injectable()
export class SinistrosService {
  constructor(private prisma: PrismaService) {}

  async listar(status?: StatusSinistro) {
    return this.prisma.sinistro.findMany({
      where: status ? { status } : undefined,
      orderBy: { dataOcorrencia: 'desc' },
      include: {
        veiculo: { select: { placa: true, modelo: true, marca: true } },
        motorista: { select: { usuario: { select: { nome: true } } } },
        seguro: { select: { seguradora: true, apolice: true, franquia: true } },
      },
    })
  }

  async buscarPorId(id: string) {
    const sinistro = await this.prisma.sinistro.findUnique({
      where: { id },
      include: {
        veiculo: { select: { placa: true, modelo: true, marca: true } },
        motorista: { select: { usuario: { select: { nome: true } } } },
        seguro: true,
        eventos: { orderBy: { criadoEm: 'desc' } },
      },
    })
    if (!sinistro) throw new NotFoundException('Sinistro não encontrado')
    return sinistro
  }

  async criar(dto: CriarSinistroDto) {
    const sinistro = await this.prisma.sinistro.create({
      data: {
        ...dto,
        dataOcorrencia: new Date(dto.dataOcorrencia),
        eventos: { create: { descricao: 'Sinistro registrado' } },
      },
    })
    return sinistro
  }

  async atualizar(id: string, dto: AtualizarSinistroDto) {
    const atual = await this.prisma.sinistro.findUnique({ where: { id } })
    if (!atual) throw new NotFoundException('Sinistro não encontrado')

    const sinistro = await this.prisma.sinistro.update({
      where: { id },
      data: dto,
    })

    if (dto.status && dto.status !== atual.status) {
      await this.prisma.sinistroEvento.create({
        data: { sinistroId: id, descricao: `Status alterado: ${atual.status} → ${dto.status}` },
      })
    }

    return sinistro
  }

  async adicionarEvento(id: string, descricao: string) {
    const sinistro = await this.prisma.sinistro.findUnique({ where: { id } })
    if (!sinistro) throw new NotFoundException('Sinistro não encontrado')
    return this.prisma.sinistroEvento.create({ data: { sinistroId: id, descricao } })
  }

  // Painel-resumo: contagens por status e custo acumulado
  async resumo() {
    const [porStatus, agregados] = await Promise.all([
      this.prisma.sinistro.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.sinistro.aggregate({
        _sum: { valorOrcado: true, valorIndenizado: true, franquiaValor: true },
        _count: { id: true },
      }),
    ])
    return {
      total: agregados._count.id,
      porStatus: Object.fromEntries(porStatus.map((s) => [s.status, s._count.id])),
      valorOrcadoTotal: agregados._sum.valorOrcado ?? 0,
      valorIndenizadoTotal: agregados._sum.valorIndenizado ?? 0,
      franquiasTotal: agregados._sum.franquiaValor ?? 0,
    }
  }
}
