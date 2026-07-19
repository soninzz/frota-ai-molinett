import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { AuditoriaService } from '../common/auditoria/auditoria.service'
import { FinanceiroService } from '../financeiro/financeiro.service'

interface CriarItemDto {
  nome: string
  codigo?: string
  categoria?: string
  quantidadeAtual?: number
  quantidadeMinima?: number
  unidade?: string
  fornecedorPref?: string
  valorMedio?: number
  localizacao?: string
}

interface RegistrarMovimentacaoDto {
  itemId: string
  tipo: 'ENTRADA' | 'SAIDA'
  quantidade: number
  motivo?: string
  veiculoId?: string
  valor?: number
}

@Injectable()
export class EstoqueService {
  constructor(
    private prisma: PrismaService,
    private auditoria: AuditoriaService,
    private financeiro: FinanceiroService,
  ) {}

  async listar() {
    return this.prisma.itemEstoque.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    })
  }

  async criar(dto: CriarItemDto, usuarioId?: string) {
    const criado = await this.prisma.itemEstoque.create({
      data: {
        nome: dto.nome,
        codigo: dto.codigo,
        categoria: dto.categoria,
        quantidadeAtual: dto.quantidadeAtual ?? 0,
        quantidadeMinima: dto.quantidadeMinima ?? 1,
        unidade: dto.unidade ?? 'un',
        fornecedorPref: dto.fornecedorPref,
        valorMedio: dto.valorMedio,
        localizacao: dto.localizacao,
      },
    })

    if (usuarioId) {
      await this.auditoria.registrar({
        usuarioId,
        entidade: 'ItemEstoque',
        registroId: criado.id,
        acao: 'CRIAR',
        depois: { nome: criado.nome, quantidadeAtual: criado.quantidadeAtual, quantidadeMinima: criado.quantidadeMinima },
      })
    }

    return criado
  }

  async registrarMovimentacao(dto: RegistrarMovimentacaoDto, usuarioId?: string) {
    const item = await this.prisma.itemEstoque.findUnique({ where: { id: dto.itemId } })
    if (!item) throw new NotFoundException('Item de estoque não encontrado')
    if (dto.quantidade <= 0) throw new BadRequestException('Quantidade deve ser maior que zero')

    const delta = dto.tipo === 'ENTRADA' ? dto.quantidade : -dto.quantidade
    const novaQuantidade = item.quantidadeAtual + delta
    if (novaQuantidade < 0) {
      throw new BadRequestException(
        `Saída de ${dto.quantidade} deixaria o estoque negativo (atual: ${item.quantidadeAtual})`,
      )
    }

    const [, atualizado] = await this.prisma.$transaction([
      this.prisma.movimentacaoEstoque.create({
        data: {
          itemId: dto.itemId,
          tipo: dto.tipo,
          quantidade: dto.quantidade,
          motivo: dto.motivo,
          veiculoId: dto.veiculoId,
          valor: dto.valor,
        },
      }),
      this.prisma.itemEstoque.update({
        where: { id: dto.itemId },
        data: { quantidadeAtual: novaQuantidade },
      }),
    ])

    if (usuarioId) {
      await this.auditoria.registrar({
        usuarioId,
        entidade: 'ItemEstoque',
        registroId: dto.itemId,
        acao: `MOVIMENTACAO_${dto.tipo}`,
        antes: { quantidadeAtual: item.quantidadeAtual },
        depois: { quantidadeAtual: atualizado.quantidadeAtual },
      })
    }

    return atualizado
  }

  // Usado pelo scheduler de alerta e pela tela de estoque, pra destacar
  // itens abaixo do mínimo cadastrado.
  async itensAbaixoDoMinimo() {
    const itens = await this.prisma.itemEstoque.findMany({ where: { ativo: true } })
    return itens.filter((i) => i.quantidadeAtual <= i.quantidadeMinima)
  }

  // ── Cruzamento estoque × orçamento mensal (S03↔S05) ──
  // Escopo funcional §5.3: "comprometido × livre; sugere reagendar quando o
  // caixa não comporta". Comprometido = já gasto em compras de estoque nos
  // últimos 30 dias; a comprar = custo estimado (valorMedio) pra repor tudo
  // que está abaixo do mínimo agora. Livre = saldo projetado dos próximos
  // 30 dias no fluxo de caixa (S05).
  async cruzamentoOrcamento() {
    const trintaDiasAtras = new Date()
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

    const [comprasRecentes, itensAbaixoMinimo, fluxo] = await Promise.all([
      this.prisma.movimentacaoEstoque.aggregate({
        where: { tipo: 'ENTRADA', criadoEm: { gte: trintaDiasAtras }, valor: { not: null } },
        _sum: { valor: true },
      }),
      this.itensAbaixoDoMinimo(),
      this.financeiro.getFluxoCaixa(30),
    ])

    const comprometido = comprasRecentes._sum.valor ?? 0
    const aComprar = itensAbaixoMinimo.reduce((soma, item) => {
      const faltam = Math.max(0, item.quantidadeMinima - item.quantidadeAtual)
      return soma + faltam * (item.valorMedio ?? 0)
    }, 0)
    const saldoLivre = fluxo.totais.entradas - fluxo.totais.saidas

    return {
      comprometido: +comprometido.toFixed(2),
      aComprar: +aComprar.toFixed(2),
      saldoLivre: +saldoLivre.toFixed(2),
      sugereReagendar: comprometido + aComprar > saldoLivre,
      itensAbaixoMinimo: itensAbaixoMinimo.map((i) => ({
        id: i.id,
        nome: i.nome,
        faltam: Math.max(0, i.quantidadeMinima - i.quantidadeAtual),
        custoEstimado: +(Math.max(0, i.quantidadeMinima - i.quantidadeAtual) * (i.valorMedio ?? 0)).toFixed(2),
      })),
    }
  }
}
