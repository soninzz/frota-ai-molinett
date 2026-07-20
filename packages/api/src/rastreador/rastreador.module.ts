import { Module } from '@nestjs/common'
import { RastreadorService } from './rastreador.service'
import { RastreadorScheduler } from './rastreador.scheduler'
import { RastreadorController } from './rastreador.controller'
import { AlertasModule } from '../alertas/alertas.module'

@Module({
  imports: [AlertasModule],
  controllers: [RastreadorController],
  providers: [RastreadorService, RastreadorScheduler],
  exports: [RastreadorService, RastreadorScheduler],
})
export class RastreadorModule {}