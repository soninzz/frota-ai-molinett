import { Recurso } from '../common/decorators/recurso.decorator'
import { Acao } from '../common/decorators/acao.decorator'
import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { OcrService } from './ocr.service'
import { LerHodometroDto, LerCupomDto, LerQrCodeDto, ConfirmarHodometroDto, LerNotaOficinaDto } from './dto/ocr.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { Perfil } from '@prisma/client'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@UseGuards(JwtAuthGuard, RolesGuard)
@Recurso('ocr')
@Controller('ocr')
export class OcrController {
  constructor(private ocrService: OcrService) {}

  @Roles(Perfil.MOTORISTA, Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('hodometro')
  @Acao('ESCREVER')
  lerHodometro(@Body() dto: LerHodometroDto) {
    return this.ocrService.lerHodometro(dto.imagemBase64, dto.mimeType)
  }

  @Roles(Perfil.MOTORISTA, Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('hodometro/confirmar')
  @Acao('ESCREVER')
  confirmarHodometro(@Body() dto: ConfirmarHodometroDto, @CurrentUser() user: any) {
    return this.ocrService.confirmarHodometro(dto.veiculoId, dto.kmHodometro, dto.confianca, dto.fonte, user.id)
  }

  @Roles(Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('nota-oficina')
  @Acao('ESCREVER')
  lerNotaOficina(@Body() dto: LerNotaOficinaDto) {
    return this.ocrService.lerNotaOficina(dto.imagemBase64, dto.mimeType)
  }

  @Roles(Perfil.MOTORISTA, Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('cupom')
  @Acao('ESCREVER')
  lerCupom(@Body() dto: LerCupomDto) {
    return this.ocrService.lerCupom(dto.imagemBase64, dto.mimeType)
  }

  // Caminho fiscalmente correto (primário) — decodifica a chave direto do
  // QR Code, sem OCR e sem consumir a cota da API de visão.
  @Roles(Perfil.MOTORISTA, Perfil.OPERACIONAL, Perfil.GESTOR_MANUTENCAO, Perfil.GESTOR_PRINCIPAL, Perfil.ADMINISTRADOR)
  @Post('qrcode-cupom')
  @Acao('ESCREVER')
  lerQrCode(@Body() dto: LerQrCodeDto) {
    return this.ocrService.lerQrCodeCupom(dto.conteudoQrCode)
  }
}
