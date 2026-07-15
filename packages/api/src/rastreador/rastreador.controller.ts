import { Controller, Get, UseGuards } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Perfil } from '@prisma/client'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rastreador')
export class RastreadorController {
  constructor(private prisma: PrismaService) {}

  // Lê a última posição conhecida direto do banco — NUNCA chama as APIs dos
  // rastreadores aqui (Assemilsat não é idempotente, cada chamada consome a
  // fila). Só o cron (RastreadorScheduler) fala com as APIs externas.
  @Get('posicoes')
  @Roles(Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  async posicoes() {
    const veiculos = await this.prisma.veiculo.findMany({
      where: { ativo: true },
      select: {
        id: true,
        placa: true,
        modelo: true,
        marca: true,
        ultimaLatitude: true,
        ultimaLongitude: true,
        ultimaVelocidade: true,
        ultimoMotorLigado: true,
        ultimaPosicaoEm: true,
        ultimaPosicaoFonte: true,
      },
    })

    return veiculos.map((v) => ({
      id: v.id,
      placa: v.placa,
      modelo: v.modelo,
      marca: v.marca,
      latitude: v.ultimaLatitude,
      longitude: v.ultimaLongitude,
      velocidade: v.ultimaVelocidade,
      motorLigado: v.ultimoMotorLigado,
      atualizadoEm: v.ultimaPosicaoEm,
      fonte: v.ultimaPosicaoFonte,
      temPosicao: v.ultimaLatitude !== null && v.ultimaLongitude !== null,
    }))
  }
}
