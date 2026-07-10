import { Module } from '@nestjs/common'
import { AlertasService } from './alertas.service'
import { AlertasController } from './alertas.controller'
import { ResumosScheduler } from './resumos.scheduler'

@Module({
  providers: [AlertasService, ResumosScheduler],
  controllers: [AlertasController],
  exports: [AlertasService], // outros módulos (cotação, manutenção, etc.) vão injetar isso
})
export class AlertasModule {}