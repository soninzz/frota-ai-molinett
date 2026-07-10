import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator'
 
export class CriarVeiculoDto {
  @IsString()
  placa: string
 
  @IsString()
  modelo: string
 
  @IsString()
  marca: string
 
  @IsNumber()
  ano: number
 
  @IsOptional()
  @IsString()
  renavam?: string
 
  @IsOptional()
  @IsString()
  chassi?: string
}
 
export class AtualizarCustoKmDto {
  @IsString()
  veiculoId: string
 
  @IsNumber()
  custoKm: number
 
  @IsOptional()
  @IsNumber()
  custoHora?: number
}