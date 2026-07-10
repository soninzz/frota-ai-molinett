import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class SimularDto {
  @IsInt()
  @Min(1)
  @Max(36)
  mesesProjecao: number

  // Variações percentuais aplicadas sobre a média histórica (baseline)
  @IsOptional()
  @IsNumber()
  variacaoReceitaPct?: number

  @IsOptional()
  @IsNumber()
  variacaoCustoFixoPct?: number

  // Premissas de diesel — se omitidas, usa a média histórica
  @IsOptional()
  @IsNumber()
  precoDiesel?: number

  @IsOptional()
  @IsNumber()
  kmMensal?: number

  @IsOptional()
  @IsNumber()
  consumoMedioKmL?: number

  // Custo fixo mensal extra (ex: novo financiamento, contratação)
  @IsOptional()
  @IsNumber()
  custoExtraMensal?: number

  @IsOptional()
  @IsString()
  descricaoCustoExtra?: string
}

export class CriarCenarioDto extends SimularDto {
  @IsString()
  nome: string

  @IsOptional()
  @IsString()
  descricao?: string
}
