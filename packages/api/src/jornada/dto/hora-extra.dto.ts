import { IsIn, IsInt, IsOptional, IsNumber, Min } from 'class-validator'
 
export class CriarHoraExtraDto {
  @IsIn(['diurna', 'noturna', 'feriado', 'domingo'])
  tipo: string
 
  @IsInt()
  @Min(1)
  minutos: number
 
  @IsOptional()
  @IsNumber()
  valorHora?: number
}