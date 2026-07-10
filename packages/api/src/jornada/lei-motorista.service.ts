import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

// Parâmetros da Lei 13.103/2015 (Lei do Motorista) — regras vivas pós-ADI 5322:
// interjornada de 11h CONTÍNUAS (fracionamento derrubado pelo STF) e descanso
// semanal de 35h gozado semanalmente, sem acúmulo.
const LIMITE_DIRECAO_DIARIA_MIN = 10 * 60 // 8h de jornada + 2h extras toleradas
const DESCANSO_INTERJORNADA_MIN = 11 * 60 // 11h contínuas entre jornadas
const DESCANSO_SEMANAL_MIN = 35 * 60 // 35h (24h + 11h) por semana
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000

// CTB art. 67-C: direção contínua máx. 5h30, com pausa de 30 min a cada 6h
const LIMITE_DIRECAO_CONTINUA_MIN = 5.5 * 60
const PAUSA_DIRECAO_MIN = 30
// CLT 235-C §2º: 1h mínima de refeição, separada da pausa de direção —
// exigida quando a jornada do dia passa de 6h (regra geral de intervalo)
const INTRAJORNADA_REFEICAO_MIN = 60
const JORNADA_MINIMA_PARA_REFEICAO_MIN = 6 * 60
const VELOCIDADE_PARADO_KMH = 5 // mesmo limiar do rastreador.service.ts

export interface ViolacaoJornada {
  tipo:
    | 'DIRECAO_DIARIA_EXCEDIDA'
    | 'INTERJORNADA_INSUFICIENTE'
    | 'DESCANSO_SEMANAL_INSUFICIENTE'
    | 'DIRECAO_CONTINUA_EXCEDIDA'
    | 'INTRAJORNADA_AUSENTE'
  viagemId: string
  detalhe: string
}

@Injectable()
export class LeiMotoristaService {
  constructor(private prisma: PrismaService) {}

  // ── Relatório de conformidade com a Lei do Motorista ──
  // Analisa as viagens concluídas do período por motorista:
  //  1. média de direção diária acima de 10h (8h + 2h extras)
  //  2. descanso entre viagens consecutivas menor que 11h
  // Obs.: direção contínua (5h30 + pausa 30min) exige granularidade de
  // posição por posição — entra quando o histórico do rastreador estiver
  // sendo persistido; hoje só temos o total acumulado por viagem.
  async relatorio(dataInicio?: string, dataFim?: string) {
    const where: Record<string, unknown> = { iniciadaEm: { not: null } }
    if (dataInicio || dataFim) {
      where.iniciadaEm = {
        not: null,
        ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
        ...(dataFim ? { lte: new Date(dataFim) } : {}),
      }
    }

    const viagens = await this.prisma.viagem.findMany({
      where,
      orderBy: [{ motoristaId: 'asc' }, { iniciadaEm: 'asc' }],
      include: {
        motorista: { select: { id: true, usuario: { select: { nome: true } } } },
        veiculo: { select: { placa: true } },
        os: { select: { numero: true } },
      },
    })

    const porMotorista = new Map<string, typeof viagens>()
    for (const v of viagens) {
      const lista = porMotorista.get(v.motoristaId) ?? []
      lista.push(v)
      porMotorista.set(v.motoristaId, lista)
    }

    const resultado = await Promise.all([...porMotorista.entries()].map(async ([motoristaId, viagensMotorista]) => {
      const violacoes: ViolacaoJornada[] = []

      for (let i = 0; i < viagensMotorista.length; i++) {
        const v = viagensMotorista[i]

        // 4) Direção contínua (5h30) e intrajornada (1h refeição) — ponto a ponto
        const analiseTelemetria = await this.analisarTelemetriaViagem(v.id)
        violacoes.push(...analiseTelemetria.violacoes)

        // 1) Direção diária média acima do limite
        if (v.htMinutos && v.iniciadaEm) {
          const fim = v.concluidaEm ?? new Date()
          const dias = Math.max(1, Math.ceil((fim.getTime() - v.iniciadaEm.getTime()) / (24 * 60 * 60 * 1000)))
          const mediaDiaria = v.htMinutos / dias
          if (mediaDiaria > LIMITE_DIRECAO_DIARIA_MIN) {
            violacoes.push({
              tipo: 'DIRECAO_DIARIA_EXCEDIDA',
              viagemId: v.id,
              detalhe: `OS #${v.os.numero} (${v.veiculo.placa}): média de ${(mediaDiaria / 60).toFixed(1)}h de direção/dia — limite ${LIMITE_DIRECAO_DIARIA_MIN / 60}h`,
            })
          }
        }

        // 2) Interjornada: descanso entre o fim desta viagem e o início da próxima
        const proxima = viagensMotorista[i + 1]
        if (v.concluidaEm && proxima?.iniciadaEm) {
          const descansoMin = (proxima.iniciadaEm.getTime() - v.concluidaEm.getTime()) / (60 * 1000)
          if (descansoMin >= 0 && descansoMin < DESCANSO_INTERJORNADA_MIN) {
            violacoes.push({
              tipo: 'INTERJORNADA_INSUFICIENTE',
              viagemId: proxima.id,
              detalhe: `Apenas ${(descansoMin / 60).toFixed(1)}h de descanso entre OS #${v.os.numero} e OS #${proxima.os.numero} — mínimo ${DESCANSO_INTERJORNADA_MIN / 60}h`,
            })
          }
        }
      }

      // 3) Descanso semanal de 35h: em cada janela de 7 dias com viagens,
      // precisa existir ao menos um intervalo livre contínuo >= 35h
      const comDatas = viagensMotorista.filter((v) => v.iniciadaEm && v.concluidaEm)
      if (comDatas.length >= 2) {
        const inicioJanela = comDatas[0].iniciadaEm!.getTime()
        const fimJanela = comDatas[comDatas.length - 1].concluidaEm!.getTime()
        for (let js = inicioJanela; js < fimJanela; js += SEMANA_MS) {
          const je = js + SEMANA_MS
          const naJanela = comDatas.filter(
            (v) => v.concluidaEm!.getTime() > js && v.iniciadaEm!.getTime() < je,
          )
          if (naJanela.length < 2) continue
          let maiorFolgaMin = 0
          for (let i = 0; i < naJanela.length - 1; i++) {
            const folga =
              (naJanela[i + 1].iniciadaEm!.getTime() - naJanela[i].concluidaEm!.getTime()) / 60000
            if (folga > maiorFolgaMin) maiorFolgaMin = folga
          }
          if (maiorFolgaMin < DESCANSO_SEMANAL_MIN) {
            violacoes.push({
              tipo: 'DESCANSO_SEMANAL_INSUFICIENTE',
              viagemId: naJanela[naJanela.length - 1].id,
              detalhe: `Semana de ${new Date(js).toLocaleDateString('pt-BR')}: maior folga contínua de ${(maiorFolgaMin / 60).toFixed(1)}h — mínimo ${DESCANSO_SEMANAL_MIN / 60}h`,
            })
          }
        }
      }

      const totalDirecaoMin = viagensMotorista.reduce((acc, v) => acc + (v.htMinutos ?? 0), 0)
      // Tempo de espera (motor ligado, parado) conta como jornada — CLT 235-C §§8º/9º
      const totalEsperaMin = viagensMotorista.reduce((acc, v) => acc + (v.hpMotorLigado ?? 0), 0)
      return {
        motoristaId,
        motorista: viagensMotorista[0].motorista.usuario.nome,
        viagensAnalisadas: viagensMotorista.length,
        horasDirecaoTotal: +(totalDirecaoMin / 60).toFixed(1),
        horasEsperaTotal: +(totalEsperaMin / 60).toFixed(1),
        horasJornadaTotal: +((totalDirecaoMin + totalEsperaMin) / 60).toFixed(1),
        violacoes,
        conforme: violacoes.length === 0,
      }
    }))

    return {
      periodo: { inicio: dataInicio ?? null, fim: dataFim ?? null },
      parametros: {
        limiteDirecaoDiariaHoras: LIMITE_DIRECAO_DIARIA_MIN / 60,
        descansoInterjornadaHoras: DESCANSO_INTERJORNADA_MIN / 60,
        descansoSemanalHoras: DESCANSO_SEMANAL_MIN / 60,
        limiteDirecaoContinuaHoras: LIMITE_DIRECAO_CONTINUA_MIN / 60,
        pausaDirecaoMinutos: PAUSA_DIRECAO_MIN,
        intrajornadaRefeicaoMinutos: INTRAJORNADA_REFEICAO_MIN,
      },
      motoristas: resultado,
      totalViolacoes: resultado.reduce((acc, m) => acc + m.violacoes.length, 0),
    }
  }

  // ── Direção contínua (5h30 + pausa 30min) e intrajornada (1h refeição) ──
  // Exige granularidade ponto-a-ponto: percorre a telemetria persistida da
  // viagem em ordem cronológica. Como a amostragem é a cada 5 min (cron do
  // rastreador), uma parada de 30min aparece como VÁRIOS pontos consecutivos
  // parados, não um único delta grande — por isso a pausa é ACUMULADA
  // (soma de deltas consecutivos sem direção), não medida ponto a ponto.
  // Gaps de sinal > 2h (falha de comunicação) não contam pra nenhum lado.
  private async analisarTelemetriaViagem(
    viagemId: string,
  ): Promise<{ violacoes: ViolacaoJornada[]; teveIntervaloRefeicao: boolean; jornadaTotalMin: number }> {
    const pontos = await this.prisma.telemetriaPosicao.findMany({
      where: { viagemId },
      orderBy: { timestamp: 'asc' },
    })

    const violacoes: ViolacaoJornada[] = []
    if (pontos.length < 2) return { violacoes, teveIntervaloRefeicao: true, jornadaTotalMin: 0 }

    let direcaoContinuaMin = 0
    let pausaAtualMin = 0
    let maiorPausaMin = 0
    let jaAlertouContinua = false
    const jornadaTotalMin = (pontos[pontos.length - 1].timestamp.getTime() - pontos[0].timestamp.getTime()) / 60000

    for (let i = 1; i < pontos.length; i++) {
      const anterior = pontos[i - 1]
      const atual = pontos[i]
      const deltaMin = (atual.timestamp.getTime() - anterior.timestamp.getTime()) / 60000
      if (deltaMin <= 0 || deltaMin > 120) {
        // Falha de sinal grande: não há evidência do que aconteceu nesse
        // intervalo — reseta os contadores em vez de somar em cima de um
        // estado que pode não ter continuidade real (evita falso positivo
        // "costurando" direção de antes e depois do buraco de dados).
        direcaoContinuaMin = 0
        pausaAtualMin = 0
        jaAlertouContinua = false
        continue
      }

      const dirigindo = atual.motorLigado && atual.velocidade > VELOCIDADE_PARADO_KMH

      if (dirigindo) {
        direcaoContinuaMin += deltaMin
        pausaAtualMin = 0 // qualquer pausa em andamento é interrompida
        if (direcaoContinuaMin > LIMITE_DIRECAO_CONTINUA_MIN && !jaAlertouContinua) {
          jaAlertouContinua = true
          violacoes.push({
            tipo: 'DIRECAO_CONTINUA_EXCEDIDA',
            viagemId,
            detalhe: `Direção contínua de ${(direcaoContinuaMin / 60).toFixed(1)}h sem pausa de ${PAUSA_DIRECAO_MIN}min — limite ${LIMITE_DIRECAO_CONTINUA_MIN / 60}h (CTB art. 67-C)`,
          })
        }
      } else {
        pausaAtualMin += deltaMin
        if (pausaAtualMin > maiorPausaMin) maiorPausaMin = pausaAtualMin
        if (pausaAtualMin >= PAUSA_DIRECAO_MIN) {
          direcaoContinuaMin = 0
          jaAlertouContinua = false
        }
      }
    }

    const precisaRefeicao = jornadaTotalMin > JORNADA_MINIMA_PARA_REFEICAO_MIN
    const teveIntervaloRefeicao = !precisaRefeicao || maiorPausaMin >= INTRAJORNADA_REFEICAO_MIN
    if (precisaRefeicao && !teveIntervaloRefeicao) {
      violacoes.push({
        tipo: 'INTRAJORNADA_AUSENTE',
        viagemId,
        detalhe: `Jornada de ${(jornadaTotalMin / 60).toFixed(1)}h sem intervalo de ${INTRAJORNADA_REFEICAO_MIN}min para refeição (maior pausa observada: ${maiorPausaMin.toFixed(0)}min) — CLT 235-C §2º`,
      })
    }

    return { violacoes, teveIntervaloRefeicao, jornadaTotalMin }
  }

  // ── Verificação na alocação de OS (Escopo v3 §S04) ──
  // "Quando uma OS atribuída exige mais horas do que o motorista pode rodar
  // no dia, o sistema sinaliza no momento da criação e sugere outro motorista."
  // Checa: interjornada de 11h desde a última viagem concluída e viagem em
  // andamento. Retorna apto/inapto + motivos, para o front decidir.
  async verificarDisponibilidade(motoristaId: string) {
    const agora = Date.now()
    const motivos: string[] = []

    const emAndamento = await this.prisma.viagem.findFirst({
      where: { motoristaId, iniciadaEm: { not: null }, concluidaEm: null },
      include: { os: { select: { numero: true } } },
    })
    if (emAndamento) {
      motivos.push(`Motorista já está em viagem (OS #${emAndamento.os.numero})`)
    }

    const ultima = await this.prisma.viagem.findFirst({
      where: { motoristaId, concluidaEm: { not: null } },
      orderBy: { concluidaEm: 'desc' },
      include: { os: { select: { numero: true } } },
    })
    if (ultima?.concluidaEm) {
      const descansoMin = (agora - ultima.concluidaEm.getTime()) / 60000
      if (descansoMin < DESCANSO_INTERJORNADA_MIN) {
        const faltam = ((DESCANSO_INTERJORNADA_MIN - descansoMin) / 60).toFixed(1)
        motivos.push(
          `Interjornada incompleta: faltam ${faltam}h de descanso desde a OS #${ultima.os.numero} (mínimo 11h contínuas)`,
        )
      }
    }

    // Sugestão de motoristas alternativos aptos (sem viagem em andamento)
    let alternativos: { id: string; nome: string }[] = []
    if (motivos.length > 0) {
      const ocupados = await this.prisma.viagem.findMany({
        where: { iniciadaEm: { not: null }, concluidaEm: null },
        select: { motoristaId: true },
      })
      const ocupadosIds = ocupados.map((v) => v.motoristaId)
      const livres = await this.prisma.motorista.findMany({
        where: { id: { notIn: [...ocupadosIds, motoristaId] } },
        select: { id: true, usuario: { select: { nome: true } } },
        take: 5,
      })
      alternativos = livres.map((m) => ({ id: m.id, nome: m.usuario.nome }))
    }

    return { motoristaId, apto: motivos.length === 0, motivos, alternativos }
  }

  // ── Hora extra por classe (tipo) e por motorista ──
  async horasExtraPorClasse(dataInicio?: string, dataFim?: string) {
    const horasExtra = await this.prisma.horaExtra.findMany({
      where: {
        ...(dataInicio || dataFim
          ? {
              criadoEm: {
                ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
                ...(dataFim ? { lte: new Date(dataFim) } : {}),
              },
            }
          : {}),
      },
      include: {
        viagem: {
          select: {
            motorista: { select: { id: true, usuario: { select: { nome: true } } } },
          },
        },
      },
    })

    // Agrupa por classe (tipo) e dentro dela por motorista
    const classes = new Map<
      string,
      { minutos: number; valor: number; motoristas: Map<string, { nome: string; minutos: number; valor: number }> }
    >()

    for (const he of horasExtra) {
      const classe = classes.get(he.tipo) ?? { minutos: 0, valor: 0, motoristas: new Map() }
      const valor = he.valorHora ? (he.minutos / 60) * he.valorHora : 0
      classe.minutos += he.minutos
      classe.valor += valor

      const mid = he.viagem.motorista.id
      const mot = classe.motoristas.get(mid) ?? { nome: he.viagem.motorista.usuario.nome, minutos: 0, valor: 0 }
      mot.minutos += he.minutos
      mot.valor += valor
      classe.motoristas.set(mid, mot)

      classes.set(he.tipo, classe)
    }

    return {
      periodo: { inicio: dataInicio ?? null, fim: dataFim ?? null },
      classes: [...classes.entries()].map(([tipo, c]) => ({
        classe: tipo,
        horasTotal: +(c.minutos / 60).toFixed(1),
        valorTotal: +c.valor.toFixed(2),
        motoristas: [...c.motoristas.values()].map((m) => ({
          nome: m.nome,
          horas: +(m.minutos / 60).toFixed(1),
          valor: +m.valor.toFixed(2),
        })),
      })),
    }
  }
}
