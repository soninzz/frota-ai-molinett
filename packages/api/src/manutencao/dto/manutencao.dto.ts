import { IsString, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator'
import { PrioridadeManutencao } from '@prisma/client'
 
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
