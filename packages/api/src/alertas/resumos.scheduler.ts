import { Injectable, Logger } from '@nestjs/common'
import { CategoriaAlerta, Perfil } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { AlertasService } from './alertas.service'

const DIA_MS = 24 * 60 * 60 * 1000

// Resumos diários por perfil (Escopo v3 §S02): gestora 07h, manutenção 07h30,
// atendimento 08h. Hoje gravam no painel de alertas; quando o WhatsApp
// conectar, o mesmo disparo passa a enviar mensagem sem mudar quem chama.
// Disparado via Vercel Cron Job → GET /cron/resumo-* (guard CronSecretGuard),
// não mais @Cron do NestJS — não roda de forma confiável em serverless.
@Injectable()
export class ResumosScheduler {
  private readonly logger = new Logger(ResumosScheduler.name)

  constructor(
    private prisma: PrismaService,
    private alertas: AlertasService,
  ) {}

  // ── Gestor principal: visão financeira + operação (07h) ──
  async resumoGestor() {
    await this.garantirRegra(CategoriaAlerta.FINANCEIRO, 'resumo_diario_gestor',
      'Resumo diário do gestor principal (07h)', [Perfil.GESTOR_PRINCIPAL])

    const hoje = new Date()
    const amanha = new Date(hoje.getTime() + DIA_MS)

    const [aVencerAmanha, atrasados, osAbertas, viagensAtivas] = await Promise.all([
      this.prisma.lancamento.aggregate({
        where: { status: 'PENDENTE', vencimento: { gte: hoje, lt: amanha } },
        _sum: { valor: true },
        _count: { id: true },
      }),
      this.prisma.lancamento.count({ where: { status: 'PENDENTE', vencimento: { lt: hoje } } }),
      this.prisma.ordemServico.count({ where: { status: { in: ['AGUARDANDO', 'EM_ANDAMENTO'] } } }),
      this.prisma.viagem.count({ where: { iniciadaEm: { not: null }, concluidaEm: null } }),
    ])

    const mensagem =
      `Bom dia! Resumo de hoje: ${aVencerAmanha._count.id} conta(s) vencendo nas próximas 24h ` +
      `(R$ ${(aVencerAmanha._sum.valor ?? 0).toFixed(2)}), ${atrasados} em atraso, ` +
      `${osAbertas} OS(s) em aberto, ${viagensAtivas} viagem(ns) em andamento.`

    await this.alertas.disparar({ categoria: 'FINANCEIRO', evento: 'resumo_diario_gestor', mensagem })
    this.logger.log('Resumo diário do gestor disparado')
  }

  // ── Gestor de manutenção (07h30) ──
  async resumoManutencao() {
    await this.garantirRegra(CategoriaAlerta.MANUTENCAO, 'resumo_diario_manutencao',
      'Resumo diário da manutenção (07h30)', [Perfil.GESTOR_MANUTENCAO])

    const em15dias = new Date(Date.now() + 15 * DIA_MS)

    const [osAbertas, aguardandoPeca, docsAVencer] = await Promise.all([
      this.prisma.osManutencao.count({
        where: { status: { in: ['SOLICITADO', 'EM_ABERTO', 'AGENDADO', 'EM_EXECUCAO'] } },
      }),
      this.prisma.osManutencao.count({ where: { status: 'AGUARDANDO_PECA' } }),
      this.prisma.documentoVeiculo.count({
        where: { pago: false, vencimento: { lte: em15dias } },
      }),
    ])

    const mensagem =
      `Bom dia! Manutenção: ${osAbertas} OS(s) em aberto, ${aguardandoPeca} aguardando peça, ` +
      `${docsAVencer} documento(s) de veículo vencendo em 15 dias.`

    await this.alertas.disparar({ categoria: 'MANUTENCAO', evento: 'resumo_diario_manutencao', mensagem })
    this.logger.log('Resumo diário da manutenção disparado')
  }

  // ── Atendimento: metas e OSs (08h) ──
  async resumoAtendimento() {
    await this.garantirRegra(CategoriaAlerta.COMERCIAL, 'resumo_diario_atendimento',
      'Resumo diário do atendimento (08h)', [Perfil.ATENDIMENTO, Perfil.OPERACIONAL])

    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const [meta, cotacoesMes, saldo] = await Promise.all([
      this.prisma.metaOperacional.findUnique({ where: { id: 'singleton' } }),
      this.prisma.cotacao.count({ where: { criadoEm: { gte: inicioMes } } }),
      this.prisma.saldoRecuperar.findUnique({ where: { id: 'singleton' } }),
    ])

    const mensagem =
      `Bom dia! Meta do mês: R$ ${(meta?.faturamentoMinimo ?? 0).toFixed(2)} de faturamento mínimo, ` +
      `${meta?.kmMaximo ?? 0} km máximo. ${cotacoesMes} cotação(ões) no mês. ` +
      `Saldo a recuperar: R$ ${(saldo?.saldoTotal ?? 0).toFixed(2)}.`

    await this.alertas.disparar({ categoria: 'COMERCIAL', evento: 'resumo_diario_atendimento', mensagem })
    this.logger.log('Resumo diário do atendimento disparado')
  }

  // Cria a regra do resumo se ainda não existir (idempotente)
  private async garantirRegra(
    categoria: CategoriaAlerta,
    evento: string,
    descricao: string,
    perfis: Perfil[],
  ) {
    const existente = await this.prisma.regraAlerta.findFirst({ where: { evento } })
    if (!existente) {
      await this.prisma.regraAlerta.create({
        data: { categoria, evento, descricao, destinatariosPerfis: perfis, canal: 'PAINEL' },
      })
      this.logger.log(`Regra de alerta criada: ${evento}`)
    }
  }
}
