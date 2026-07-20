import { Module } from '@nestjs/common'
import { CronController } from './cron.controller'
import { RastreadorModule } from '../../rastreador/rastreador.module'
import { AlertasModule } from '../../alertas/alertas.module'
import { EstoqueModule } from '../../estoque/estoque.module'
import { FinanceiroModule } from '../../financeiro/financeiro.module'
import { LgpdModule } from '../../lgpd/lgpd.module'

@Module({
  imports: [RastreadorModule, AlertasModule, EstoqueModule, FinanceiroModule, LgpdModule],
  controllers: [CronController],
})
export class CronModule {}
