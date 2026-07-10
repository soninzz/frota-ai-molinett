import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'
import { StatusSinistro } from '@prisma/client'

export class AtualizarSinistroDto {
  @IsOptional()
  @IsEnum(StatusSinistro)
  status?: StatusSinistro

  @IsOptional()
  @IsString()
  protocolo?: string

  @IsOptional()
  @IsString()
  boletimUrl?: string

  @IsOptional()
  @IsNumber()
  franquiaValor?: number

  @IsOptional()
  @IsNumber()
  valorOrcado?: number

  @IsOptional()
  @IsNumber()
  valorIndenizado?: number

  @IsOptional()
  @IsString()
  observacao?: string
}
