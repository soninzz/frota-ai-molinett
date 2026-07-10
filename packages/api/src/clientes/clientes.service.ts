import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CriarClienteDto } from './dto/criar-cliente.dto'
 
@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}
 
  async listar() {
    return this.prisma.cliente.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    })
  }
 
  async buscarPorId(id: string) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } })
    if (!cliente) throw new NotFoundException('Cliente não encontrado')
    return cliente
  }
 
  async criar(dto: CriarClienteDto) {
    if (dto.cnpj) {
      const existente = await this.prisma.cliente.findUnique({ where: { cnpj: dto.cnpj } })
      if (existente) throw new BadRequestException('Já existe um cliente com esse CNPJ')
    }
 
    return this.prisma.cliente.create({
      data: {
        nome: dto.nome,
        cnpj: dto.cnpj,
        telefone: dto.telefone,
        email: dto.email,
        regraPrazo: dto.regraPrazo,
      },
    })
  }
}