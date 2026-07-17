import { Module } from '@nestjs/common'
import { OcrController } from './ocr.controller'
import { OcrService } from './ocr.service'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'

@Module({
  imports: [AuditoriaModule],
  controllers: [OcrController],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
