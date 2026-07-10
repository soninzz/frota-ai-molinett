import { Module } from '@nestjs/common'
import { SinistrosController } from './sinistros.controller'
import { SinistrosService } from './sinistros.service'

@Module({
  controllers: [SinistrosController],
  providers: [SinistrosService],
  exports: [SinistrosService],
})
export class SinistrosModule {}
