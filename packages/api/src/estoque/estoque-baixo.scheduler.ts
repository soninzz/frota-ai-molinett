import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { CategoriaAlerta, Perfil } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { AlertasService } from '../alertas/alertas.service'
import { EstoqueService } from './estoque.service'

const TZ = 'America/Sao_Paulo'

// Escopo funcional §5.3: alerta de compra ao bater estoque mínimo. Os campos
// (quantidadeAtual/quantidadeMinima) já existiam no schema, mas nada
// comparava um contra o outro — roda 1x por dia às 07h.
@Injectable()
export class EstoqueBaixoScheduler {
  private readonly logger = new Logger(EstoqueBaixoScheduler.name)

  constructor(
    private prisma: PrismaService,
    private alertas: AlertasService,
    private estoque: EstoqueService,
  ) {}

  @Cron('0 0 7 * * *', { timeZone: TZ })
  async verificarEstoqueBaixo() {
    try {
      await this.garantirRegra()
      const itens = await this.estoque.itensAbaixoDoMinimo()
      for (const item of itens) {
        await this.alertas.disparar({
          categoria: CategoriaAlerta.MANUTENCAO,
          evento: 'estoque_abaixo_minimo',
          mensagem: `${item.nome}: ${item.quantidadeAtual} ${item.unidade} em estoque, mínimo é ${item.quantidadeMinima} ${item.unidade} — considere comprar.`,
          contexto: { itemId: item.id, quantidadeAtual: item.quantidadeAtual, quantidadeMinima: item.quantidadeMinima },
        })
      }
      this.logger.log(`Verificação de estoque mínimo concluída — ${itens.length} item(ns) abaixo do mínimo`)
    } catch (e) {
      this.logger.error('Falha ao verificar estoque mínimo', e)
    }
  }

  private async garantirRegra() {
    const existente = await this.prisma.regraAlerta.findFirst({ where: { evento: 'estoque_abaixo_minimo' } })
    if (!existente) {
      await this.prisma.regraAlerta.create({
        data: {
          categoria: CategoriaAlerta.MANUTENCAO,
          evento: 'estoque_abaixo_minimo',
          descricao: 'Item de estoque abaixo da quantidade mínima cadastrada',
          destinatariosPerfis: [Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL],
          canal: 'PAINEL',
        },
      })
      this.logger.log('Regra de alerta criada: estoque_abaixo_minimo')
    }
  }
}
