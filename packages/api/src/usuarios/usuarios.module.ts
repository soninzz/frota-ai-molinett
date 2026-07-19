import { Module } from '@nestjs/common'
import { UsuariosService } from './usuarios.service'
import { UsuariosController } from './usuarios.controller'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'
import { AlertasModule } from '../alertas/alertas.module'

@Module({
  imports: [AuditoriaModule, AlertasModule],
  providers: [UsuariosService],
  controllers: [UsuariosController],
  exports: [UsuariosService],
})
export class UsuariosModule {}
