import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { IniciarViagemDto } from './dto/iniciar-viagem.dto'
import { FinalizarViagemDto } from './dto/finalizar-viagem.dto'
 
@Injectable()
export class ViagensService {
  constructor(private prisma: PrismaService) {}
 
  async iniciar(dto: IniciarViagemDto) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: dto.osId },
      include: { cotacao: true, viagem: true },
    })
 
    if (!os) throw new NotFoundException('Ordem de serviço não encontrada')
    if (os.viagem) throw new BadRequestException('Esta OS já possui viagem iniciada')
    if (os.status !== 'AGUARDANDO') {
      throw new BadRequestException(`OS está com status ${os.status}, não pode iniciar viagem`)
    }
 
    const motoristaId = dto.motoristaId ?? os.cotacao.motoristaId
    if (!motoristaId) {
      throw new BadRequestException('Nenhum motorista vinculado — informe motoristaId')
    }
 
    const viagem = await this.prisma.$transaction(async (tx) => {
      const v = await tx.viagem.create({
        data: {
          osId: os.id,
          veiculoId: os.cotacao.veiculoId,
          motoristaId,
          kmInicio: dto.kmInicio,
          iniciadaEm: new Date(),
        },
      })
 
      await tx.ordemServico.update({
        where: { id: os.id },
        data: { status: 'EM_ANDAMENTO' },
      })
 
      return v
    })
 
    return viagem
  }
 
  async finalizar(id: string, dto: FinalizarViagemDto) {
    const viagem = await this.prisma.viagem.findUnique({
      where: { id },
      include: {
        veiculo: true,
        motorista: true,
        os: { include: { cotacao: true } },
      },
    })
 
    if (!viagem) throw new NotFoundException('Viagem não encontrada')
    if (viagem.concluidaEm) throw new BadRequestException('Viagem já foi finalizada')
    if (!viagem.kmInicio) throw new BadRequestException('Viagem sem km de início registrado')
    if (dto.kmFim < viagem.kmInicio) {
      throw new BadRequestException('Km final não pode ser menor que o km inicial')
    }
 
    const kmRodado = dto.kmFim - viagem.kmInicio
    const receitaReal = viagem.os.cotacao.valorFinal
    const custoKm = viagem.veiculo.custoKmAtual ?? viagem.os.cotacao.custoKmSnapshot
    const custoReal = kmRodado * custoKm
    const margemReal = receitaReal - custoReal
    const positivo = margemReal >= 0
 
    const percentual = viagem.motorista.comissaoPct
    const valorComissao = +(receitaReal * (percentual / 100)).toFixed(2)
 
    const resultado = await this.prisma.$transaction(async (tx) => {
      const viagemAtualizada = await tx.viagem.update({
        where: { id },
        data: {
          kmFim: dto.kmFim,
          kmRodado,
          concluidaEm: new Date(),
          htMinutos: dto.htMinutos,
          hpMotorLigado: dto.hpMotorLigado,
          hpMotorDesligado: dto.hpMotorDesligado,
          observacao: dto.observacao,
          receitaReal,
          custoReal,
          margemReal,
          positivo,
        },
      })
 
      await tx.ordemServico.update({
        where: { id: viagem.osId },
        data: { status: 'CONCLUIDA', concluidaEm: new Date() },
      })
 
      const comissao = await tx.comissao.create({
        data: {
          osId: viagem.osId,
          motoristaId: viagem.motoristaId,
          percentual,
          valor: valorComissao,
        },
      })
 
      return { viagem: viagemAtualizada, comissao }
    })
 
    return resultado
  }
 
  async listar(filtros: { motoristaId?: string; veiculoId?: string }) {
    return this.prisma.viagem.findMany({
      where: {
        motoristaId: filtros.motoristaId,
        veiculoId: filtros.veiculoId,
      },
      include: {
        veiculo: { select: { placa: true, modelo: true } },
        motorista: { select: { id: true, usuario: { select: { nome: true } } } },
        os: { select: { numero: true, status: true } },
        horasExtra: true,
      },
      orderBy: { criadoEm: 'desc' },
      take: 100,
    })
  }
 
  async detalhe(id: string) {
    const viagem = await this.prisma.viagem.findUnique({
      where: { id },
      include: {
        veiculo: true,
        motorista: { include: { usuario: { select: { nome: true } } } },
        os: { include: { cotacao: true } },
        horasExtra: true,
      },
    })
 
    if (!viagem) throw new NotFoundException('Viagem não encontrada')
    return viagem
  }
 
  async adicionarHoraExtra(viagemId: string, dto: { tipo: string; minutos: number; valorHora?: number }) {
    const viagem = await this.prisma.viagem.findUnique({ where: { id: viagemId } })
    if (!viagem) throw new NotFoundException('Viagem não encontrada')
 
    return this.prisma.horaExtra.create({
      data: {
        viagemId,
        tipo: dto.tipo,
        minutos: dto.minutos,
        valorHora: dto.valorHora,
      },
    })
  }
}