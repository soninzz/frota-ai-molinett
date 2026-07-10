import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { RastreadorService } from './rastreador.service'

@Injectable()
export class RastreadorScheduler {
  private readonly logger = new Logger(RastreadorScheduler.name)
  private executando = false

  constructor(
    private config: ConfigService,
    private rastreadorService: RastreadorService,
  ) {}

  // A cada 5 min busca as posições novas do Assemilsat e atualiza HT/HP
  // das viagens em andamento. Só roda em TRACKER_MODE=live — em mock as
  // posições são aleatórias e poluiriam as viagens reais.
  @Cron(CronExpression.EVERY_5_MINUTES)
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
      await this.rastreadorService.atualizarViagensEmAndamento()
      this.logger.log('Sincronização de posições concluída')
    } catch (e) {
      this.logger.error('Falha na sincronização de posições', e)
    } finally {
      this.executando = false
    }
  }
}
