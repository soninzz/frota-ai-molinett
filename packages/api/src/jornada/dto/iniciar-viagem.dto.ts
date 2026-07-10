import { IsInt, IsOptional, IsString, Min } from 'class-validator'
 
export class IniciarViagemDto {
  @IsString()
  osId: string
 
  @IsInt()
  @Min(0)
  kmInicio: number
 
  @IsOptional()
  @IsString()
  motoristaId?: string // se não vier, usa o motorista já vinculado na cotação
}