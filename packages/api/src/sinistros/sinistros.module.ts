import { Module } from '@nestjs/common'
import { SinistrosController } from './sinistros.controller'
import { SinistrosService } from './sinistros.service'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'

@Module({
  imports: [AuditoriaModule],
  controllers: [SinistrosController],
  providers: [SinistrosService],
  exports: [SinistrosService],
})
export class SinistrosModule {}
