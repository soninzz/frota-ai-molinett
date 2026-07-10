import { Module } from '@nestjs/common'
import { DieselService } from './diesel.service'
import { DieselController } from './diesel.controller'
import { FrotaModule } from '../frota/frota.module'
 
@Module({
  imports:     [FrotaModule],
  providers:   [DieselService],
  controllers: [DieselController],
  exports:     [DieselService],
})
export class DieselModule {}