import { Module } from '@nestjs/common'
import { ComandosWhatsappService } from './comandos.service'
import { ComandosController } from './comandos.controller'
import { FinanceiroModule } from '../financeiro/financeiro.module'
import { CotacaoModule } from '../cotacao/cotacao.module'
import { FrotaModule } from '../frota/frota.module'
import { JornadaModule } from '../jornada/jornada.module'

@Module({
  imports: [FinanceiroModule, CotacaoModule, FrotaModule, JornadaModule],
  providers: [ComandosWhatsappService],
  controllers: [ComandosController],
  exports: [ComandosWhatsappService],
})
export class WhatsappModule {}
