import { Module } from '@nestjs/common'
import { OcrController } from './ocr.controller'
import { OcrService } from './ocr.service'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'
import { LlmModule } from '../common/llm/llm.module'

@Module({
  imports: [AuditoriaModule, LlmModule],
  controllers: [OcrController],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
