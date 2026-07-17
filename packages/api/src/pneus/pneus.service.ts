import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { TipoMovimentacaoPneu, PosicaoPneu } from '@prisma/client'
import { CriarPneuDto } from './dto/criar-pneu.dto'
import { AuditoriaService } from '../common/auditoria/auditoria.service'

@Injectable()
export class PneusService {
  constructor(
    private prisma: PrismaService,
    private auditoria: AuditoriaService,
  ) {}

  async listarPorVeiculo(veiculoId: string) {
    return this.prisma.pneu.findMany({
      where:   { veiculoId, ativo: true },
      include: { movimentacoes: { orderBy: { criadoEm: 'desc' }, take: 3 } },
    })
  }

  async criar(dto: CriarPneuDto, usuarioId?: string) {
    const existente = await this.prisma.pneu.findUnique({ where: { codigo: dto.codigo } })
    if (existente) {
      throw new BadRequestException('Já existe um pneu com esse código')
    }

    const criado = await this.prisma.pneu.create({
      data: {
        codigo: dto.codigo,
        veiculoId: dto.veiculoId,
        marca: dto.marca,
        modelo: dto.modelo,
        tamanho: dto.tamanho,
        podeVirar: dto.podeVirar ?? true,
      },
    })

    if (usuarioId) {
      await this.auditoria.registrar({
        usuarioId,
        entidade: 'Pneu',
        registroId: criado.id,
        acao: 'CRIAR',
        depois: { codigo: criado.codigo, veiculoId: criado.veiculoId },
      })
    }

    return criado
  }
 
  async registrarMovimentacao(
    pneuId:    string,
    tipo:      TipoMovimentacaoPneu,
    veiculoId: string,
    kmAtual:   number,
    posicaoDe?: PosicaoPneu,
    posicaoPara?: PosicaoPneu,
    valor?:    number,
    fornecedor?: string,
    usuarioId?: string,
  ) {
    const pneu = await this.prisma.pneu.findUnique({ where: { id: pneuId } })
    if (!pneu) throw new NotFoundException('Pneu não encontrado')

    // Valida virada — pneu sem flecha pode ser virado
    if (tipo === 'VIRADA' && !pneu.podeVirar) {
      throw new BadRequestException('Este pneu não pode ser virado — tem flecha direcional.')
    }

    // Registra movimentação
    await this.prisma.movimentacaoPneu.create({
      data: {
        pneuId,
        veiculoId,
        tipo,
        posicaoDe,
        posicaoPara,
        kmNaMomento: kmAtual,
        fornecedor,
        valor,
      },
    })

    // Atualiza posição atual do pneu
    const atualizado = await this.prisma.pneu.update({
      where: { id: pneuId },
      data:  {
        posicaoAtual:  posicaoPara ?? null,
        kmAcumulados:  { increment: 0 }, // será recalculado
      },
    })

    if (usuarioId) {
      await this.auditoria.registrar({
        usuarioId,
        entidade: 'Pneu',
        registroId: pneuId,
        acao: `MOVIMENTACAO_${tipo}`,
        antes: { posicaoAtual: pneu.posicaoAtual },
        depois: { posicaoAtual: atualizado.posicaoAtual, kmAtual },
      })
    }

    return atualizado
  }
}



