import { IsInt, IsOptional, IsString, Min } from 'class-validator'
 
export class FinalizarViagemDto {
  @IsInt()
  @Min(0)
  kmFim: number
 
  @IsOptional()
  @IsInt()
  @Min(0)
  htMinutos?: number // horas trabalhadas, motor ligado
 
  @IsOptional()
  @IsInt()
  @Min(0)
  hpMotorLigado?: number
 
  @IsOptional()
  @IsInt()
  @Min(0)
  hpMotorDesligado?: number
 
  @IsOptional()
  @IsString()
  observacao?: string
}