import { Module } from '@nestjs/common'
import { FinanceiroService } from './financeiro.service'
import { FinanceiroController } from './financeiro.controller'
import { FinanceiroClientesService } from './financeiro-clientes.service'
import { FinanceiroMetasService } from './financeiro-metas.service'
import { MetasScheduler } from './metas.scheduler'

@Module({
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
  ],
})
export class FinanceiroModule {}