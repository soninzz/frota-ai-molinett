import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { Perfil } from '@prisma/client'
import { ComandosWhatsappService } from './comandos.service'
import { CaptacaoGrupoService } from './captacao-grupo.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Recurso } from '../common/decorators/recurso.decorator'
import { Acao } from '../common/decorators/acao.decorator'

// Endpoints de teste do parser de comando/captação — simulam mensagem
// recebida sem depender do webhook do WhatsApp estar plugado. Quando o canal
// oficial conectar, o webhook chama esses services direto, sem reescrever
// a lógica de interpretação.
@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('whatsapp')
@Controller('whatsapp')
export class ComandosController {
  constructor(
    private comandos: ComandosWhatsappService,
    private captacaoGrupo: CaptacaoGrupoService,
  ) {}

  @Post('comando')
  @Acao('ESCREVER')
  @Roles(Perfil.ATENDIMENTO, Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.FINANCEIRO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  processar(@Body('texto') texto: string) {
    return this.comandos.processar(texto ?? '')
  }

  // Simula mensagem de GRUPO (diferente de /comando, que é 1:1) — capta
  // pedido por palavra-chave e alerta o atendimento; nunca cria cotação
  // sozinho.
  @Post('grupo')
  @Acao('ESCREVER')
  @Roles(Perfil.ATENDIMENTO, Perfil.OPERACIONAL, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  processarGrupo(@Body('grupoNome') grupoNome: string, @Body('autor') autor: string, @Body('texto') texto: string) {
    return this.captacaoGrupo.processarMensagemGrupo(grupoNome ?? 'grupo sem nome', autor ?? 'desconhecido', texto ?? '')
  }
}
