import { IsInt, IsOptional, IsString, Min } from 'class-validator'
 
export class CriarVeiculoDto {
  @IsString()
  placa: string
 
  @IsString()
  modelo: string
 
  @IsString()
  marca: string
 
  @IsInt()
  @Min(1980)
  ano: number
 
  @IsOptional()
  @IsString()
  renavam?: string
 
  @IsOptional()
  @IsString()
  chassi?: string
}