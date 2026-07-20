import { Controller, Get, UseGuards } from '@nestjs/common'
import { CronSecretGuard } from '../guards/cron-secret.guard'
import { RastreadorScheduler } from '../../rastreador/rastreador.scheduler'
import { DocumentosVencendoScheduler } from '../../alertas/documentos-vencendo.scheduler'
import { ResumosScheduler } from '../../alertas/resumos.scheduler'
import { EstoqueBaixoScheduler } from '../../estoque/estoque-baixo.scheduler'
import { MetasScheduler } from '../../financeiro/metas.scheduler'
import { ExpurgoTelemetriaScheduler } from '../../lgpd/expurgo-telemetria.scheduler'

// Único ponto de entrada HTTP pra todos os jobs agendados do sistema —
// substitui os @Cron do NestJS, que não rodam de forma confiável em
// serverless (Vercel não mantém processo vivo entre requisições). 7 desses
// endpoints são chamados pelo Vercel Cron Job nativo (1x/dia, plano Hobby);
// /rastreador é chamado por um pinger externo a cada 5 min (frequência que
// o Hobby não permite nativamente). Todos protegidos pelo mesmo CRON_SECRET.
@UseGuards(CronSecretGuard)
@Controller('cron')
export class CronController {
  constructor(
    private rastreadorScheduler: RastreadorScheduler,
    private documentosVencendoScheduler: DocumentosVencendoScheduler,
    private resumosScheduler: ResumosScheduler,
    private estoqueBaixoScheduler: EstoqueBaixoScheduler,
    private metasScheduler: MetasScheduler,
    private expurgoTelemetriaScheduler: ExpurgoTelemetriaScheduler,
  ) {}

  // A cada 5 min (pinger externo)
  @Get('rastreador')
  rastreador() {
    return this.rastreadorScheduler.sincronizarPosicoes()
  }

  // 06h — Vercel Cron Job
  @Get('documentos-vencendo')
  documentosVencendo() {
    return this.documentosVencendoScheduler.verificarVencimentos()
  }

  // 07h — Vercel Cron Job
  @Get('resumo-gestor')
  resumoGestor() {
    return this.resumosScheduler.resumoGestor()
  }

  // 07h30 — Vercel Cron Job
  @Get('resumo-manutencao')
  resumoManutencao() {
    return this.resumosScheduler.resumoManutencao()
  }

  // 08h — Vercel Cron Job
  @Get('resumo-atendimento')
  resumoAtendimento() {
    return this.resumosScheduler.resumoAtendimento()
  }

  // 07h — Vercel Cron Job
  @Get('estoque-baixo')
  estoqueBaixo() {
    return this.estoqueBaixoScheduler.verificarEstoqueBaixo()
  }

  // 00h05 — Vercel Cron Job
  @Get('metas')
  metas() {
    return this.metasScheduler.recalcularDiario()
  }

  // Dia 1 de cada mês, meia-noite — Vercel Cron Job
  @Get('lgpd-expurgo')
  lgpdExpurgo() {
    return this.expurgoTelemetriaScheduler.expurgar()
  }
}
