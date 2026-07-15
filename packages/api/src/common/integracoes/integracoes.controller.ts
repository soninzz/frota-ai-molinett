import { Controller, Get, UseGuards } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { RolesGuard } from '../guards/roles.guard'
import { Roles } from '../decorators/roles.decorator'
import { Perfil } from '@prisma/client'
import { Recurso } from '../decorators/recurso.decorator'

// Limiares de "sem dados há X min" por fonte — critério §4 do doc de
// critérios de sucesso ("verde quando... vermelho quando...").
const LIMIAR_MINUTOS: Record<string, number> = {
  rastreador: 15,
  rastreador_megasat: 15,
  ocr_gemini: 24 * 60,
  ocr_anthropic: 24 * 60,
  bcb_sgs: 26 * 60, // série é diária, tolera até ~1 dia útil de atraso
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('integracoes')
@Controller('integracoes')
export class IntegracoesController {
  constructor(private prisma: PrismaService) {}

  @Get('saude')
  @Roles(Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR, Perfil.GESTOR_MANUTENCAO)
  async saude() {
    const fontes = await this.prisma.integracaoLog.groupBy({
      by: ['fonte'],
      _max: { timestamp: true },
    })

    const resultado = await Promise.all(
      fontes.map(async (f) => {
        const ultimo = await this.prisma.integracaoLog.findFirst({
          where: { fonte: f.fonte },
          orderBy: { timestamp: 'desc' },
        })
        if (!ultimo) return null

        const minutosDesdeUltimo = (Date.now() - ultimo.timestamp.getTime()) / 60000
        const limiar = LIMIAR_MINUTOS[f.fonte] ?? 60
        const semDadosHaMuitoTempo = minutosDesdeUltimo > limiar

        let saude: 'verde' | 'amarelo' | 'vermelho' = 'verde'
        if (ultimo.status === 'ERRO' || semDadosHaMuitoTempo) saude = 'vermelho'
        else if (ultimo.status === 'DEGRADADO') saude = 'amarelo'

        return {
          fonte: f.fonte,
          saude,
          ultimoStatus: ultimo.status,
          ultimaAtualizacao: ultimo.timestamp,
          minutosDesdeUltimo: Math.round(minutosDesdeUltimo),
          limiarMinutos: limiar,
          detalhes: ultimo.detalhes,
          erro: ultimo.erro,
        }
      }),
    )

    return resultado.filter(Boolean)
  }
}
