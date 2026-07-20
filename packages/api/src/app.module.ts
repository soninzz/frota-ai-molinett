import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { CorrelationIdMiddleware } from './common/observabilidade/correlation-id.middleware'
import { LoggingInterceptor } from './common/observabilidade/logging.interceptor'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './auth/auth.module'
import { CotacaoModule } from './cotacao/cotacao.module'
import { FrotaModule } from './frota/frota.module'
import { ManutencaoModule } from './manutencao/manutencao.module'
import { DieselModule } from './diesel/diesel.module'
import { PneusModule } from './pneus/pneus.module'
import { FinanceiroModule } from './financeiro/financeiro.module'
import { JornadaModule } from './jornada/jornada.module'
import { ClientesModule } from './clientes/clientes.module'
import { RastreadorModule } from './rastreador/rastreador.module'
import { AlertasModule } from './alertas/alertas.module'
import { SinistrosModule } from './sinistros/sinistros.module'
import { SimuladorModule } from './simulador/simulador.module'
import { OcrModule } from './ocr/ocr.module'
import { AuditoriaModule } from './common/auditoria/auditoria.module'
import { IntegracoesModule } from './common/integracoes/integracoes.module'
import { PermissoesModule } from './common/permissoes/permissoes.module'
import { LgpdModule } from './lgpd/lgpd.module'
import { UsuariosModule } from './usuarios/usuarios.module'
import { EstoqueModule } from './estoque/estoque.module'
import { WhatsappModule } from './whatsapp/whatsapp.module'
import { CronModule } from './common/cron/cron.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:    true,
      envFilePath: '../../.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    CotacaoModule,
    FrotaModule,
    ManutencaoModule,
    DieselModule,
    PneusModule,
    FinanceiroModule,
    JornadaModule,
    ClientesModule,
    RastreadorModule,
    AlertasModule,
    SinistrosModule,
    SimuladorModule,
    OcrModule,
    AuditoriaModule,
    IntegracoesModule,
    PermissoesModule,
    LgpdModule,
    UsuariosModule,
    EstoqueModule,
    WhatsappModule,
    CronModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*')
  }
}