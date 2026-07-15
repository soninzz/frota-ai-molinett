import { IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator'

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

// Confirma (com ou sem correção humana) a leitura do hodômetro e grava
// como km atual do veículo — só aqui o dado vira fonte oficial de km.
export class ConfirmarHodometroDto {
  @IsString()
  veiculoId: string

  @IsInt()
  @Min(0)
  kmHodometro: number

  @IsOptional()
  @IsNumber()
  confianca?: number

  @IsOptional()
  @IsString()
  fonte?: string // 'gemini' | 'anthropic' | 'manual'
}
