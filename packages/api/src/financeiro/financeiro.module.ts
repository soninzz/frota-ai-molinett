import { Module } from '@nestjs/common'
import { FinanceiroService } from './financeiro.service'
import { FinanceiroController } from './financeiro.controller'
import { FinanceiroClientesService } from './financeiro-clientes.service'
import { FinanceiroMetasService } from './financeiro-metas.service'
 
@Module({
  providers: [
    FinanceiroService,
    FinanceiroClientesService,
    FinanceiroMetasService,
  ],
  controllers: [FinanceiroController],
  exports: [
    FinanceiroService,
    FinanceiroClientesService,
    FinanceiroMetasService,
  ],
})
export class FinanceiroModule {}