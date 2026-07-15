import { Module } from '@nestjs/common'
import { IntegracoesController } from './integracoes.controller'

@Module({
  controllers: [IntegracoesController],
})
export class IntegracoesModule {}
