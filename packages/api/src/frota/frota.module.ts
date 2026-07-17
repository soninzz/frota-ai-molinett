import { Module } from '@nestjs/common'
import { FrotaService } from './frota.service'
import { FrotaController } from './frota.controller'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'

@Module({
  imports:     [AuditoriaModule],
  providers:   [FrotaService],
  controllers: [FrotaController],
  exports:     [FrotaService],
})
export class FrotaModule {}