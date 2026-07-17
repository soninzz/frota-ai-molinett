import { Module } from '@nestjs/common'
import { PneusService } from './pneus.service'
import { PneusController } from './pneus.controller'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'

@Module({
  imports:     [AuditoriaModule],
  providers:   [PneusService],
  controllers: [PneusController],
  exports:     [PneusService],
})
export class PneusModule {}