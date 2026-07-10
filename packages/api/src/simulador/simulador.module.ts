import { Module } from '@nestjs/common'
import { SimuladorController } from './simulador.controller'
import { SimuladorService } from './simulador.service'
import { MercadoService } from './mercado.service'

@Module({
  controllers: [SimuladorController],
  providers: [SimuladorService, MercadoService],
})
export class SimuladorModule {}
