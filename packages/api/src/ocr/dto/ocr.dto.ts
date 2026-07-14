import { IsString, IsOptional } from 'class-validator'

export class LerHodometroDto {
  @IsString()
  imagemBase64: string

  @IsOptional()
  @IsString()
  mimeType?: string // ex: 'image/jpeg'
}

export class LerCupomDto {
  @IsString()
  imagemBase64: string

  @IsOptional()
  @IsString()
  mimeType?: string
}

export class LerQrCodeDto {
  @IsString()
  conteudoQrCode: string // URL completa ou chave nua de 44 dígitos
}
