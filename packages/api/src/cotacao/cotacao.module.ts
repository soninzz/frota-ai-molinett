import { Module } from '@nestjs/common'
import { CotacaoService } from './cotacao.service'
import { CotacaoController } from './cotacao.controller'
import { CotacaoSaldoService } from './cotacao-saldo.service'
import { CotacaoMetasService } from './cotacao-metas.service'
import { CotacaoTabelaService } from './cotacao-tabela.service'
import { AlertasModule } from '../alertas/alertas.module'

@Module({
  imports: [AlertasModule],
  providers: [
    CotacaoService,
    CotacaoSaldoService,
    CotacaoMetasService,
    CotacaoTabelaService,
  ],
  controllers: [CotacaoController],
  exports: [CotacaoService, CotacaoSaldoService, CotacaoMetasService],
})
export class CotacaoModule {}