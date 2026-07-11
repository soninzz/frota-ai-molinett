import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { FinanceiroMetasService } from './financeiro-metas.service'

const TZ = 'America/Sao_Paulo'

// Escopo v3 §S05: "as metas operacionais se ajustam dinamicamente ao longo
// do mês conforme novas despesas são lançadas" — recalcula 1x por dia às
// 00h05, além de poder ser chamado manualmente via POST /financeiro/metas/recalcular.
@Injectable()
export class MetasScheduler {
  private readonly logger = new Logger(MetasScheduler.name)

  constructor(private metasService: FinanceiroMetasService) {}

  @Cron('0 5 0 * * *', { timeZone: TZ })
  async recalcularDiario() {
    const { faturamentoMinimo, kmMaximo } = await this.metasService.recalcularMetas()
    this.logger.log(`Metas recalculadas: faturamentoMinimo=${faturamentoMinimo.toFixed(2)} kmMaximo=${kmMaximo}`)
  }
}
