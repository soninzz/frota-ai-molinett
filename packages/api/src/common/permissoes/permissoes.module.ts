import { Module } from '@nestjs/common'
import { PermissoesService } from './permissoes.service'
import { PermissoesController } from './permissoes.controller'
import { AuditoriaModule } from '../auditoria/auditoria.module'

@Module({
  imports: [AuditoriaModule],
  controllers: [PermissoesController],
  providers: [PermissoesService],
})
export class PermissoesModule {}
