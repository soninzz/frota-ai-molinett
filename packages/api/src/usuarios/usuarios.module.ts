import { Module } from '@nestjs/common'
import { UsuariosService } from './usuarios.service'
import { UsuariosController } from './usuarios.controller'
import { AuditoriaModule } from '../common/auditoria/auditoria.module'

@Module({
  imports: [AuditoriaModule],
  providers: [UsuariosService],
  controllers: [UsuariosController],
  exports: [UsuariosService],
})
export class UsuariosModule {}
