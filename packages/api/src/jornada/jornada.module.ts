import { Module } from '@nestjs/common'
import { ViagensService } from './viagens.service'
import { MotoristasService } from './motoristas.service'
import { ComissoesService } from './comissoes.service'
import { LeiMotoristaService } from './lei-motorista.service'
import { JornadaController } from './jornada.controller'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'

@Module({
  imports: [AuditoriaModule],
  providers: [ViagensService, MotoristasService, ComissoesService, LeiMotoristaService],
  controllers: [JornadaController],
})
export class JornadaModule {}