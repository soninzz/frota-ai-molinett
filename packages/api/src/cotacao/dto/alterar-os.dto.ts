import { IsString, IsOptional, IsNumber } from 'class-validator'
 
export class AlterarOsDto {
  @IsString()
  osId: string
 
  @IsString()
  motivo: string
 
  @IsOptional()
  @IsNumber()
  novoValor?: number
 
  @IsOptional()
  @IsString()
  novoMotoristaId?: string
}