// Cole em: packages/api/src/cotacao/dto/aprovar-cotacao.dto.ts

import { IsString } from 'class-validator'

export class AprovarCotacaoDto {
  @IsString()
  motivo: string
}