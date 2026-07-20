import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RastreadorService } from './rastreador.service'

// Disparado via GET /cron/rastreador (guard CronSecretGuard), não mais por
// @Cron do NestJS — a Vercel é serverless, não mantém processo vivo pro
// scheduler em memória disparar sozinho (achado ao vivo em produção: a
// sincronização ficou 272 minutos sem rodar mesmo com o cron "registrado").
// A cada 5 min é chamado por um pinger externo (fora da Vercel — o plano
// Hobby só permite Cron Job nativo 1x/dia, não dá pra usar Vercel Cron aqui).
@Injectable()
export class RastreadorScheduler {
  private readonly logger = new Logger(RastreadorScheduler.name)
  private executando = false

  constructor(
    private config: ConfigService,
    private rastreadorService: RastreadorService,
  ) {}

  // Busca as posições novas do Assemilsat/MegaSat e atualiza HT/HP das
  // viagens em andamento. Só roda em TRACKER_MODE=live — em mock as posições
  // são aleatórias e poluiriam as viagens reais.
  async sincronizarPosicoes() {
    const modo = this.config.get<string>('TRACKER_MODE', 'mock')
    if (modo !== 'live') {
      this.logger.debug('TRACKER_MODE!=live — sincronização de posições pulada')
      return
    }
    if (this.executando) {
      this.logger.warn('Sincronização anterior ainda em andamento — pulando ciclo')
      return
    }

    this.executando = true
    try {
      await this.rastreadorService.sincronizarPosicoes()
      this.logger.log('Sincronização de posições concluída')
    } catch (e) {
      this.logger.error('Falha na sincronização de posições', e)
    } finally {
      this.executando = false
    }
  }
}
