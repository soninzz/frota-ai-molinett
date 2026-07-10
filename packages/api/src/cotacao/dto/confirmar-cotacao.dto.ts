// Cole em: packages/api/src/cotacao/dto/confirmar-cotacao.dto.ts
// Substitui o arquivo inteiro

import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator'

export class ConfirmarCotacaoDto {
  @IsString()
  cotacaoId: string

  // Min(-100) permite margem negativa — a regra de bloqueio/aprovação
  // é tratada dentro do CotacaoService.confirmar(), não na validação de entrada.
  @IsNumber()
  @Min(-100)
  @Max(20)
  margemPct: number // negativo, 0, 5, 10, 15 ou 20

  @IsOptional()
  @IsNumber()
  deficitRegistrado?: number // se fechou abaixo do ideal

  @IsOptional()
  @IsString()
  justificativaDeficit?: string
}