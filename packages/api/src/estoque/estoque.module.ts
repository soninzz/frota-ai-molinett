import { Module } from '@nestjs/common'
import { EstoqueService } from './estoque.service'
import { EstoqueController } from './estoque.controller'
import { EstoqueBaixoScheduler } from './estoque-baixo.scheduler'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'
import { AlertasModule } from '../alertas/alertas.module'
import { FinanceiroModule } from '../financeiro/financeiro.module'

@Module({
  imports: [AuditoriaModule, AlertasModule, FinanceiroModule],
  providers: [EstoqueService, EstoqueBaixoScheduler],
  controllers: [EstoqueController],
  exports: [EstoqueService],
})
export class EstoqueModule {}
