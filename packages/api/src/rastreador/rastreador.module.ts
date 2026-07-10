import { Module } from '@nestjs/common'
import { RastreadorService } from './rastreador.service'
import { RastreadorScheduler } from './rastreador.scheduler'

@Module({
  providers: [RastreadorService, RastreadorScheduler],
  exports: [RastreadorService],
})
export class RastreadorModule {}