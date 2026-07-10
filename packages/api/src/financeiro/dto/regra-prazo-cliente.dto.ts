import { IsString, IsObject } from 'class-validator'
 
export class RegrasPrazoClienteDto {
  @IsString()
  clienteId: string
 
  @IsObject()
  // ex: { tipo: 'dias', valor: 30 }
  // ex: { tipo: 'dia_mes', dia: 20, proximo_mes: true }
  regraPrazo: Record<string, any>
}