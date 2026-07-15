import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { CategoriaAlerta, Perfil } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { AlertasService } from './alertas.service'

const TZ = 'America/Sao_Paulo'
const DIA_MS = 24 * 60 * 60 * 1000

// "Regras vivas" de conformidade (guardrail 13): CNH, toxicológico, MOPP,
// NR-20 (motorista) e aferição de tacógrafo (veículo). Antes as regras de
// alerta existiam só como definição cadastrada (seed) — nada calculava a
// data real de vencimento contra hoje. Roda 1x por dia às 06h.
@Injectable()
export class DocumentosVencendoScheduler {
  private readonly logger = new Logger(DocumentosVencendoScheduler.name)

  constructor(
    private prisma: PrismaService,
    private alertas: AlertasService,
  ) {}

  @Cron('0 0 6 * * *', { timeZone: TZ })
  async verificarVencimentos() {
    try {
      await this.verificarMotoristas()
      await this.verificarTacografos()
      this.logger.log('Verificação de documentos a vencer concluída')
    } catch (e) {
      this.logger.error('Falha ao verificar documentos a vencer', e)
    }
  }

  private async verificarMotoristas() {
    const motoristas = await this.prisma.motorista.findMany({
      where: { usuario: { ativo: true } },
      include: { usuario: { select: { nome: true } } },
    })

    const hoje = new Date()

    for (const m of motoristas) {
      await this.checarData(m.cnhVencimento, 60, 'CNH_A_VENCER', CategoriaAlerta.COMPLIANCE,
        `CNH de ${m.usuario.nome} vence em`, { motoristaId: m.id })

      if (m.toxicologicoVencimento) {
        await this.checarData(m.toxicologicoVencimento, 60, 'TOXICOLOGICO_A_VENCER', CategoriaAlerta.COMPLIANCE,
          `Exame toxicológico de ${m.usuario.nome} vence em`, { motoristaId: m.id })
      }
      if (m.mopp && m.moppVencimento) {
        await this.checarData(m.moppVencimento, 30, 'MOPP_A_VENCER', CategoriaAlerta.COMPLIANCE,
          `MOPP de ${m.usuario.nome} vence em`, { motoristaId: m.id })
      }
      if (m.nr20 && m.nr20Vencimento) {
        await this.checarData(m.nr20Vencimento, 30, 'NR20_A_VENCER', CategoriaAlerta.COMPLIANCE,
          `NR-20 de ${m.usuario.nome} vence em`, { motoristaId: m.id })
      }
    }
    void hoje
  }

  private async verificarTacografos() {
    const veiculos = await this.prisma.veiculo.findMany({
      where: { ativo: true, tacografoAfericaoVencimento: { not: null } },
    })

    for (const v of veiculos) {
      await this.checarData(
        v.tacografoAfericaoVencimento!,
        30,
        'TACOGRAFO_AFERIÇÃO_A_VENCER',
        CategoriaAlerta.COMPLIANCE,
        `Aferição do tacógrafo do veículo ${v.placa} vence em`,
        { veiculoId: v.id },
      )
    }
  }

  private async checarData(
    vencimento: Date,
    antecedenciaDias: number,
    evento: string,
    categoria: CategoriaAlerta,
    mensagemPrefixo: string,
    contexto: Record<string, unknown>,
  ) {
    const hoje = new Date()
    const diasRestantes = Math.round((vencimento.getTime() - hoje.getTime()) / DIA_MS)
    if (diasRestantes < 0 || diasRestantes > antecedenciaDias) return

    await this.alertas.disparar({
      categoria,
      evento,
      mensagem: `${mensagemPrefixo} ${diasRestantes} dia(s) (${vencimento.toLocaleDateString('pt-BR')})`,
      contexto: { ...contexto, vencimento, diasRestantes },
    })
  }
}
