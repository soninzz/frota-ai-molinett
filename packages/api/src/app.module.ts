import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
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
  ],
})
export class AppModule {}