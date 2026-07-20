import { Module } from '@nestjs/common'
import { FinanceiroService } from './financeiro.service'
import { FinanceiroController } from './financeiro.controller'
import { FinanceiroClientesService } from './financeiro-clientes.service'
import { FinanceiroMetasService } from './financeiro-metas.service'
import { MetasScheduler } from './metas.scheduler'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'

@Module({
  imports: [AuditoriaModule],
  providers: [
    FinanceiroService,
    FinanceiroClientesService,
    FinanceiroMetasService,
    MetasScheduler,
  ],
  controllers: [FinanceiroController],
  exports: [
    FinanceiroService,
    FinanceiroClientesService,
    FinanceiroMetasService,
    MetasScheduler,
  ],
})
export class FinanceiroModule {}