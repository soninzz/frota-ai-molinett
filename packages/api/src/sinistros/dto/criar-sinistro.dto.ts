import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'
import { TipoSinistro } from '@prisma/client'

export class CriarSinistroDto {
  @IsString()
  veiculoId: string

  @IsOptional()
  @IsString()
  motoristaId?: string

  @IsOptional()
  @IsString()
  seguroId?: string

  @IsEnum(TipoSinistro)
  tipo: TipoSinistro

  @IsDateString()
  dataOcorrencia: string

  @IsOptional()
  @IsString()
  local?: string

  @IsString()
  descricao: string

  @IsOptional()
  @IsString()
  boletimUrl?: string

  @IsOptional()
  @IsString()
  protocolo?: string

  @IsOptional()
  @IsNumber()
  franquiaValor?: number

  @IsOptional()
  @IsNumber()
  valorOrcado?: number

  @IsOptional()
  @IsBoolean()
  terceiroEnvolvido?: boolean

  @IsOptional()
  @IsString()
  terceiroDados?: string

  @IsOptional()
  @IsString()
  observacao?: string
}
