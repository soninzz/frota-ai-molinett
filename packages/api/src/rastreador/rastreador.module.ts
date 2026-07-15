import { Module } from '@nestjs/common'
import { RastreadorService } from './rastreador.service'
import { RastreadorScheduler } from './rastreador.scheduler'
import { RastreadorController } from './rastreador.controller'

@Module({
  controllers: [RastreadorController],
  providers: [RastreadorService, RastreadorScheduler],
  exports: [RastreadorService],
})
export class RastreadorModule {}