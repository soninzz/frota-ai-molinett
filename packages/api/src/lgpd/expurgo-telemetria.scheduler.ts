import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../database/prisma.service'

const TZ = 'America/Sao_Paulo'

// RIPD §2.1/§5 (gap listado no próprio relatório): "GPS bruto acumula
// indefinidamente" — sem rotina de expurgo. Prazo de 12 meses é o exemplo
// sugerido no documento. Só apaga TelemetriaPosicao (posição bruta, alto
// volume); não mexe em Viagem/HoraExtra (dados já agregados/necessários
// pra folha e histórico financeiro, fora do escopo desse gap específico).
const RETENCAO_MESES = 12

@Injectable()
export class ExpurgoTelemetriaScheduler {
  private readonly logger = new Logger(ExpurgoTelemetriaScheduler.name)

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, { timeZone: TZ })
  async expurgar() {
    try {
      const limite = new Date()
      limite.setMonth(limite.getMonth() - RETENCAO_MESES)

      const resultado = await this.prisma.telemetriaPosicao.deleteMany({
        where: { timestamp: { lt: limite } },
      })

      this.logger.log(`Expurgo LGPD: ${resultado.count} posições de telemetria (>${RETENCAO_MESES} meses) removidas`)
    } catch (e) {
      this.logger.error('Falha no expurgo automático de telemetria', e)
    }
  }
}
