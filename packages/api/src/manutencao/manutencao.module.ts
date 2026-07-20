import { Module } from '@nestjs/common'
import { ManutencaoService } from './manutencao.service'
import { ManutencaoController } from './manutencao.controller'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'
import { LlmModule } from '../common/llm/llm.module'

@Module({
  imports:     [AuditoriaModule, LlmModule],
  providers:   [ManutencaoService],
  controllers: [ManutencaoController],
  exports:     [ManutencaoService],
})
export class ManutencaoModule {}