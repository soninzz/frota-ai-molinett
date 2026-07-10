import { IsString, IsNumber, IsOptional, Min } from 'class-validator'
 
export class RegistrarAbastecimentoDto {
  @IsString()
  veiculoId: string
 
  @IsOptional()
  @IsString()
  motoristaId?: string
 
  @IsNumber()
  @Min(1)
  kmHodometro: number   // FONTE PRIMÁRIA — lido do painel físico
 
  @IsNumber()
  @Min(0.1)
  volumeLitros: number
 
  @IsNumber()
  @Min(0.1)
  valorTotal: number
 
  @IsNumber()
  @Min(0.1)
  precoPorLitro: number
 
  @IsOptional()
  @IsString()
  postoCnpj?: string
 
  @IsOptional()
  @IsString()
  postoNome?: string
 
  @IsOptional()
  @IsString()
  painelFotoUrl?: string  // URL da foto do painel no S3
 
  @IsOptional()
  @IsString()
  cupomFotoUrl?: string   // URL da foto do cupom no S3
}