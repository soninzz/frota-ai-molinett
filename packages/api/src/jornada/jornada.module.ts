import { Module } from '@nestjs/common'
import { ViagensService } from './viagens.service'
import { MotoristasService } from './motoristas.service'
import { ComissoesService } from './comissoes.service'
import { LeiMotoristaService } from './lei-motorista.service'
import { JornadaController } from './jornada.controller'

@Module({
  providers: [ViagensService, MotoristasService, ComissoesService, LeiMotoristaService],
  controllers: [JornadaController],
})
export class JornadaModule {}