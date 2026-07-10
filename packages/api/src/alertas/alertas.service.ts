import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CriarAlertaDto } from './dto/criar-alerta.dto'
 
@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name)
 
  constructor(private prisma: PrismaService) {}
 
  // ── Ponto único de disparo — qualquer módulo chama isso ──
  // Hoje: só grava no banco (aparece no painel /alertas do frontend).
  // Quando o WhatsApp chegar: além de gravar, também dispara a
  // mensagem de verdade — sem precisar mudar quem chama este método.
  async disparar(dto: CriarAlertaDto) {
    // Busca as regras cadastradas para essa categoria/evento
    const regras = await this.prisma.regraAlerta.findMany({
      where: { categoria: dto.categoria as any, evento: dto.evento, ativo: true },
    })
 
    if (regras.length === 0) {
      this.logger.debug(`Nenhuma regra ativa para o evento ${dto.evento} — alerta não disparado`)
      return null
    }
 
    // Registra um histórico por regra (cada regra pode ter destinatários diferentes)
    const historicos = await Promise.all(
      regras.map((regra) =>
        this.prisma.historicoAlerta.create({
          data: {
            regraId: regra.id,
            destinatario: 'painel', // hoje só o painel; vira número de WhatsApp depois
            canal: 'PAINEL',
            payload: { mensagem: dto.mensagem, contexto: dto.contexto ?? {} },
            entregue: true, // "entregue" no painel = já visível na tela
          },
        }),
      ),
    )
 
    this.logger.log(`Alerta disparado: ${dto.evento} (${historicos.length} destinatário(s))`)
    return historicos
  }
 
  // ── Lista alertas recentes para o painel web ──
  async listarRecentes(limite = 50) {
    return this.prisma.historicoAlerta.findMany({
      orderBy: { enviadoEm: 'desc' },
      take: limite,
      include: { regra: { select: { categoria: true, evento: true, descricao: true } } },
    })
  }
 
  // ── Cadastro de regras (painel administrativo) ──
  async listarRegras() {
    return this.prisma.regraAlerta.findMany({ orderBy: { categoria: 'asc' } })
  }
 
  async criarRegra(dto: {
    categoria: string
    evento: string
    descricao: string
    destinatariosPerfis: string[]
  }) {
    return this.prisma.regraAlerta.create({
      data: {
        categoria: dto.categoria as any,
        evento: dto.evento,
        descricao: dto.descricao,
        destinatariosPerfis: dto.destinatariosPerfis as any,
        canal: 'PAINEL',
      },
    })
  }
 
  async alternarRegra(id: string, ativo: boolean) {
    return this.prisma.regraAlerta.update({ where: { id }, data: { ativo } })
  }
}
 