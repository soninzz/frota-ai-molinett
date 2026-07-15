import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { FrotaService } from '../frota/frota.service'
import { RegistrarAbastecimentoDto } from './dto/abastecimento.dto'
 
@Injectable()
export class DieselService {
  constructor(
    private prisma:  PrismaService,
    private frota:   FrotaService,
  ) {}
 
  async registrarAbastecimento(dto: RegistrarAbastecimentoDto) {
    // Busca último abastecimento para calcular km do trecho
    const ultimo = await this.prisma.abastecimento.findFirst({
      where:   { veiculoId: dto.veiculoId },
      orderBy: { timestamp: 'desc' },
    })
 
    // Valida que hodômetro é crescente (guardrail — km monotônico)
    if (ultimo && dto.kmHodometro <= ultimo.kmHodometro) {
      throw new BadRequestException(
        `Hodômetro inválido. Último registrado: ${ultimo.kmHodometro} km. Valor enviado: ${dto.kmHodometro} km.`
      )
    }
 
    const kmRodadoTrecho = ultimo ? dto.kmHodometro - ultimo.kmHodometro : null
    const consumoKmL     = kmRodadoTrecho && dto.volumeLitros > 0
      ? parseFloat((kmRodadoTrecho / dto.volumeLitros).toFixed(2))
      : null
 
    const abastecimento = await this.prisma.abastecimento.create({
      data: {
        veiculoId:       dto.veiculoId,
        motoristaId:     dto.motoristaId,
        kmHodometro:     dto.kmHodometro,
        volumeLitros:    dto.volumeLitros,
        valorTotal:      dto.valorTotal,
        precoPorLitro:   dto.precoPorLitro,
        postoCnpj:       dto.postoCnpj,
        postoNome:       dto.postoNome,
        painelFotoUrl:   dto.painelFotoUrl,
        cupomFotoUrl:    dto.cupomFotoUrl,
        kmRodadoTrecho,
        consumoKmL,
        pendenteCupom:   !dto.cupomFotoUrl,
      },
    })
 
    // Recalcula custo/km real do veículo após abastecimento
    await this.frota.calcularCustoKmReal(dto.veiculoId)
 
    // Detecta anomalia de consumo
    const anomalia = await this.detectarAnomalia(dto.veiculoId, consumoKmL)
 
    return { abastecimento, anomalia }
  }
 
  async getHistorico(veiculoId: string, limite = 20) {
    return this.prisma.abastecimento.findMany({
      where:   { veiculoId },
      orderBy: { timestamp: 'desc' },
      take:    limite,
      include: { motorista: { include: { usuario: true } } },
    })
  }
 
  async getMediaConsumo(veiculoId: string): Promise<number | null> {
    const abastecimentos = await this.prisma.abastecimento.findMany({
      where:   { veiculoId, consumoKmL: { not: null } },
      orderBy: { timestamp: 'desc' },
      take:    10,
    })
 
    if (abastecimentos.length === 0) return null
 
    const media = abastecimentos.reduce((acc, a) => acc + (a.consumoKmL ?? 0), 0) / abastecimentos.length
    return parseFloat(media.toFixed(2))
  }
 
  async detectarAnomalia(veiculoId: string, consumoAtual: number | null) {
    if (!consumoAtual) return null
 
    const mediaHistorica = await this.getMediaConsumo(veiculoId)
    if (!mediaHistorica) return null
 
    const variacaoPct = ((mediaHistorica - consumoAtual) / mediaHistorica) * 100
 
    // Alerta se queda > 15% da média histórica
    if (variacaoPct > 15) {
      return {
        alerta:          true,
        consumoAtual,
        mediaHistorica,
        variacaoPct:     parseFloat(variacaoPct.toFixed(1)),
        mensagem:        `Consumo excessivo detectado. Média histórica: ${mediaHistorica} km/L, atual: ${consumoAtual} km/L (queda de ${variacaoPct.toFixed(1)}%). Possíveis causas: bico injetor, sensor lambda, filtro de combustível, condução agressiva.`,
      }
    }
 
    return null
  }
 
  async getPendentesCupom() {
    return this.prisma.abastecimento.findMany({
      where:   { pendenteCupom: true },
      include: { veiculo: true, motorista: { include: { usuario: true } } },
      orderBy: { timestamp: 'desc' },
    })
  }

  // Sugestão de postos por preço/rendimento — baseado no histórico real de
  // abastecimentos (não tem dado de horário/rota ainda, só preço e consumo
  // médio observado em cada posto).
  async sugerirPostos(limiteMeses = 6) {
    const desde = new Date()
    desde.setMonth(desde.getMonth() - limiteMeses)

    const abastecimentos = await this.prisma.abastecimento.findMany({
      where: {
        timestamp: { gte: desde },
        postoNome: { not: null },
      },
      select: { postoNome: true, precoPorLitro: true, consumoKmL: true },
    })

    const porPosto = new Map<string, { precos: number[]; consumos: number[] }>()
    for (const a of abastecimentos) {
      const nome = a.postoNome as string
      const grupo = porPosto.get(nome) ?? { precos: [], consumos: [] }
      grupo.precos.push(a.precoPorLitro)
      if (a.consumoKmL !== null) grupo.consumos.push(a.consumoKmL)
      porPosto.set(nome, grupo)
    }

    const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

    const ranking = [...porPosto.entries()]
      .map(([posto, g]) => ({
        posto,
        precoMedioLitro: +media(g.precos).toFixed(3),
        rendimentoMedioKmL: g.consumos.length ? +media(g.consumos).toFixed(2) : null,
        amostras: g.precos.length,
      }))
      .filter((r) => r.amostras >= 2) // descarta posto com 1 amostra só (ruído)
      .sort((a, b) => a.precoMedioLitro - b.precoMedioLitro)

    return { periodo: { desde, meses: limiteMeses }, ranking }
  }
}