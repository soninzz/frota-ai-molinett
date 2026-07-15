import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CriarVeiculoDto } from './dto/criar-veiculo.dto'

@Injectable()
export class FrotaService {
  constructor(private prisma: PrismaService) {}

  async listarVeiculos() {
    return this.prisma.veiculo.findMany({
      where: { ativo: true },
      orderBy: { placa: 'asc' },
    })
  }

  async findById(id: string) {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id },
      include: {
        itensRevisao:     { where: { ativo: true } },
        pneus:            { where: { ativo: true } },
        seguros:          true,
        documentosVeiculo: true,
      },
    })
    if (!veiculo) throw new NotFoundException('Veículo não encontrado')
    return veiculo
  }

  // Painel principal — resumo de todos os veículos
  async getPainelPrincipal() {
    const veiculos = await this.prisma.veiculo.findMany({
      where: { ativo: true },
      include: {
        itensRevisao:     { where: { ativo: true } },
        documentosVeiculo: true,
        seguros:          true,
      },
    })

    const hoje = new Date()
    const em30dias = new Date()
    em30dias.setDate(hoje.getDate() + 30)

    return veiculos.map(v => {
      // Revisões a vencer — por DATA ou por KM (fonte única de km: hodômetro
      // via OCR/confirmação manual em v.kmAtual, nunca o rastreador)
      const revisoesCriticas = v.itensRevisao.filter(item => {
        if (item.dataProxima && item.dataProxima <= em30dias) return true
        if (item.kmProximo !== null && v.kmAtual !== null) {
          const faltamKm = item.kmProximo - v.kmAtual
          if (faltamKm <= item.kmAlerta) return true
        }
        return false
      })

      // Documentos a vencer
      const documentosACvencer = v.documentosVeiculo.filter(
        doc => !doc.pago && doc.vencimento <= em30dias
      )

      // Seguros a vencer
      const segurosAVencer = v.seguros.filter(
        s => s.vencimento <= em30dias
      )

      return {
        id:              v.id,
        placa:           v.placa,
        modelo:          v.modelo,
        marca:           v.marca,
        custoKmAtual:    v.custoKmAtual,
        custoHoraAtual:  v.custoHoraAtual,
        alertas: {
          revisoesCriticas:    revisoesCriticas.length,
          documentosAVencer:   documentosACvencer.length,
          segurosAVencer:      segurosAVencer.length,
        },
        proximasRevisoes: revisoesCriticas.slice(0, 3).map(r => ({
          nome:        r.nome,
          kmProximo:   r.kmProximo,
          dataProxima: r.dataProxima,
        })),
      }
    })
  }

  // Atualiza custo/km de um veículo (chamado pelo S03 após abastecimento)
  async atualizarCustoKm(veiculoId: string, custoKm: number, custoHora?: number) {
    return this.prisma.veiculo.update({
      where: { id: veiculoId },
      data: {
        custoKmAtual:           custoKm,
        custoHoraAtual:         custoHora,
        custoKmAtualizadoEm:    new Date(),
      },
    })
  }

  async criar(dto: CriarVeiculoDto) {
    const existente = await this.prisma.veiculo.findUnique({
      where: { placa: dto.placa.toUpperCase() },
    })
    if (existente) {
      throw new BadRequestException('Já existe um veículo com essa placa')
    }

    return this.prisma.veiculo.create({
      data: {
        placa: dto.placa.toUpperCase(),
        modelo: dto.modelo,
        marca: dto.marca,
        ano: dto.ano,
        renavam: dto.renavam,
        chassi: dto.chassi,
      },
    })
  }

  // Calcula custo/km real baseado nos dados do mês
  async calcularCustoKmReal(veiculoId: string): Promise<number> {
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    // Busca abastecimentos do mês
    const abastecimentos = await this.prisma.abastecimento.findMany({
      where: { veiculoId, timestamp: { gte: inicioMes } },
    })

    // Busca OSs de manutenção do mês
    const manutencoes = await this.prisma.osManutencao.findMany({
      where: { veiculoId, status: 'CONCLUIDO', criadoEm: { gte: inicioMes } },
    })

    const custosCombustivel = abastecimentos.reduce((acc, a) => acc + a.valorTotal, 0)
    const custosManutencao  = manutencoes.reduce((acc, m) => acc + (m.valorReal ?? 0), 0)

    // KM rodado no mês (via hodômetro)
    const kmMes = abastecimentos.reduce((acc, a) => acc + (a.kmRodadoTrecho ?? 0), 0)

    if (kmMes === 0) {
      const veiculo = await this.prisma.veiculo.findUnique({ where: { id: veiculoId } })
      return veiculo?.custoKmAtual ?? 4.5
    }

    const custoTotal = custosCombustivel + custosManutencao
    const custoKm    = custoTotal / kmMes

    // Atualiza no banco
    await this.atualizarCustoKm(veiculoId, custoKm)

    return custoKm
  }
}