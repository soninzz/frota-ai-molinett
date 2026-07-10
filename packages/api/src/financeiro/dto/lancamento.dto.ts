import {
  IsString, IsNumber, IsOptional, IsEnum,
  IsDateString, IsBoolean, Min
} from 'class-validator'
import { TipoLancamento, FormaPagamento } from '@prisma/client'
 
export class CriarLancamentoDto {
  @IsEnum(TipoLancamento)
  tipo: TipoLancamento
 
  @IsString()
  descricao: string
 
  @IsNumber()
  @Min(0.01)
  valor: number
 
  @IsDateString()
  vencimento: string
 
  @IsString()
  contaBancariaId: string  // OBRIGATÓRIO — guardrail 5
 
  @IsOptional()
  @IsEnum(FormaPagamento)
  formaPagamento?: FormaPagamento
 
  @IsOptional()
  @IsString()
  centroCustoId?: string
 
  @IsOptional()
  @IsString()
  contaContabilId?: string
 
  @IsOptional()
  @IsString()
  clienteId?: string
 
  @IsOptional()
  @IsString()
  veiculoId?: string
 
  @IsOptional()
  @IsString()
  dataNf?: string
 
  @IsOptional()
  @IsString()
  nfeChave?: string
 
  @IsOptional()
  @IsString()
  observacao?: string
 
  @IsOptional()
  @IsBoolean()
  recorrente?: boolean
 
  @IsOptional()
  @IsString()
  periodicidade?: string
}
 
export class BaixarLancamentoDto {
  @IsString()
  lancamentoId: string
 
  @IsDateString()
  pagoEm: string
 
  @IsOptional()
  @IsNumber()
  valorPago?: number
}