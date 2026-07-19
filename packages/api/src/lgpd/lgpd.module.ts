import { Module } from '@nestjs/common'
import { LgpdController } from './lgpd.controller'
import { ExpurgoTelemetriaScheduler } from './expurgo-telemetria.scheduler'

@Module({
  controllers: [LgpdController],
  providers: [ExpurgoTelemetriaScheduler],
})
export class LgpdModule {}
