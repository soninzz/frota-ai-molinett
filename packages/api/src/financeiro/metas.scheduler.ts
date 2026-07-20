import { Injectable, Logger } from '@nestjs/common'
import { FinanceiroMetasService } from './financeiro-metas.service'

// Escopo v3 §S05: "as metas operacionais se ajustam dinamicamente ao longo
// do mês conforme novas despesas são lançadas" — recalcula 1x por dia às
// 00h05 via Vercel Cron Job → GET /cron/metas (guard CronSecretGuard), além
// de poder ser chamado manualmente via POST /financeiro/metas/recalcular.
// Não mais @Cron do NestJS — não roda de forma confiável em serverless.
@Injectable()
export class MetasScheduler {
  private readonly logger = new Logger(MetasScheduler.name)

  constructor(private metasService: FinanceiroMetasService) {}

  async recalcularDiario() {
    const { faturamentoMinimo, kmMaximo } = await this.metasService.recalcularMetas()
    this.logger.log(`Metas recalculadas: faturamentoMinimo=${faturamentoMinimo.toFixed(2)} kmMaximo=${kmMaximo}`)
  }
}
