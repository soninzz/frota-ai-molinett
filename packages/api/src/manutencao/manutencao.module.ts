import { Module } from '@nestjs/common'
import { ManutencaoService } from './manutencao.service'
import { ManutencaoController } from './manutencao.controller'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'

@Module({
  imports:     [AuditoriaModule],
  providers:   [ManutencaoService],
  controllers: [ManutencaoController],
  exports:     [ManutencaoService],
})
export class ManutencaoModule {}