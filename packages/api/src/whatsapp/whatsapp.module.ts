import { Module } from '@nestjs/common'
import { ComandosWhatsappService } from './comandos.service'
import { ComandosController } from './comandos.controller'
import { CaptacaoGrupoService } from './captacao-grupo.service'
import { FinanceiroModule } from '../financeiro/financeiro.module'
import { CotacaoModule } from '../cotacao/cotacao.module'
import { FrotaModule } from '../frota/frota.module'
import { JornadaModule } from '../jornada/jornada.module'
import { AlertasModule } from '../alertas/alertas.module'

@Module({
  imports: [FinanceiroModule, CotacaoModule, FrotaModule, JornadaModule, AlertasModule],
  providers: [ComandosWhatsappService, CaptacaoGrupoService],
  controllers: [ComandosController],
  exports: [ComandosWhatsappService, CaptacaoGrupoService],
})
export class WhatsappModule {}
