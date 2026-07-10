import { IsBoolean, IsOptional, IsString } from 'class-validator'
 
export class CriarPneuDto {
  @IsString()
  codigo: string
 
  @IsString()
  veiculoId: string
 
  @IsString()
  marca: string
 
  @IsString()
  modelo: string
 
  @IsString()
  tamanho: string
 
  @IsOptional()
  @IsBoolean()
  podeVirar?: boolean
}