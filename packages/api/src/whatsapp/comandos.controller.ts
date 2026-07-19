import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { Perfil } from '@prisma/client'
import { ComandosWhatsappService } from './comandos.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Recurso } from '../common/decorators/recurso.decorator'

// Endpoint de teste do parser de comando — simula uma mensagem recebida
// sem depender do webhook do WhatsApp estar plugado. Quando o canal
// oficial conectar, o webhook chama ComandosWhatsappService.processar()
// direto, sem precisar reescrever essa lógica.
@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('whatsapp')
@Controller('whatsapp')
export class ComandosController {
  constructor(private comandos: ComandosWhatsappService) {}

  @Post('comando')
  @Roles(Perfil.ATENDIMENTO, Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  processar(@Body('texto') texto: string) {
    return this.comandos.processar(texto ?? '')
  }
}
