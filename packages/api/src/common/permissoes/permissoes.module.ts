import { Module } from '@nestjs/common'
import { PermissoesService } from './permissoes.service'
import { PermissoesController } from './permissoes.controller'
import { AuditoriaModule } from '../auditoria/auditoria.module'
import { AlertasModule } from '../../alertas/alertas.module'

@Module({
  imports: [AuditoriaModule, AlertasModule],
  controllers: [PermissoesController],
  providers: [PermissoesService],
})
export class PermissoesModule {}
