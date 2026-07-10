import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator'

export class SimularFinanciamentoDto {
  @IsNumber()
  @Min(0.01)
  valorParcela: number

  @IsInt()
  @Min(1)
  @Max(120)
  numParcelas: number

  // Variações opcionais sobre o baseline, iguais às do simulador
  @IsOptional()
  @IsNumber()
  variacaoReceitaPct?: number

  @IsOptional()
  @IsNumber()
  variacaoCustoFixoPct?: number
}

export class CompararCenariosDto {
  @IsNumber()
  @Min(0.01)
  valor: number

  @IsInt()
  @Min(1)
  @Max(120)
  meses: number

  // Taxa anual da dívida que seria antecipada (ex: 24 = 24% a.a.)
  @IsOptional()
  @IsNumber()
  taxaDividaAnualPct?: number

  // Retorno anual esperado do reinvestimento (ex: comprar outro caminhão)
  @IsOptional()
  @IsNumber()
  retornoReinvestimentoAnualPct?: number
}
