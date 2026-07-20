import { Module } from '@nestjs/common'
import { AlertasService } from './alertas.service'
import { AlertasController } from './alertas.controller'
import { ResumosScheduler } from './resumos.scheduler'
import { DocumentosVencendoScheduler } from './documentos-vencendo.scheduler'

@Module({
  providers: [AlertasService, ResumosScheduler, DocumentosVencendoScheduler],
  controllers: [AlertasController],
  // AlertasService: outros módulos (cotação, manutenção, etc.) vão injetar isso.
  // Os dois schedulers: exportados só pro CronModule conseguir disparar via HTTP.
  exports: [AlertasService, ResumosScheduler, DocumentosVencendoScheduler],
})
export class AlertasModule {}