import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { PrioridadeManutencao } from '@prisma/client'

// Item extraído da leitura de nota de oficina (POST /ocr/nota-oficina),
// revisado/corrigido pelo usuário antes de virar OS — nunca gravado direto
// da leitura de IA sem essa confirmação.
export class PecaOsDto {
  @IsString()
  descricao: string

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantidade?: number

  @IsOptional()
  @IsNumber()
  valorUnitario?: number
}

export class CriarOsManutencaoDto {
  @IsString()
  veiculoId: string
 
  @IsString()
  descricao: string
 
  @IsEnum(PrioridadeManutencao)
  prioridade: PrioridadeManutencao
 
  @IsOptional()
  @IsString()
  subsistema?: string
 
  @IsOptional()
  @IsString()
  oficina?: string
 
  @IsOptional()
  @IsNumber()
  valorEstimado?: number
 
  @IsOptional()
  @IsDateString()
  prazoEstimado?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PecaOsDto)
  pecas?: PecaOsDto[]
}
 
export class AtualizarStatusOsDto {
  @IsString()
  status: string
 
  @IsOptional()
  @IsNumber()
  valorReal?: number
 
  @IsOptional()
  @IsString()
  observacao?: string
}
