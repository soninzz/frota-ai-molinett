import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator'
 
export class CriarCotacaoDto {
  @IsString()
  clienteId: string
 
  @IsString()
  veiculoId: string
 
  @IsOptional()
  @IsString()
  motoristaId?: string
 
  @IsString()
  origem: string
 
  @IsString()
  destino: string
 
  @IsOptional()
  @IsNumber()
  @Min(1)
  kmEstimado?: number
 
  @IsOptional()
  @IsString()
  tipoServico?: string

}

export class AprovarCotacaoDto {
  @IsString()
  motivo: string
}