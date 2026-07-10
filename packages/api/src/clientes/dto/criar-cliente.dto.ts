import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator'
 
export class CriarClienteDto {
  @IsString()
  nome: string
 
  @IsOptional()
  @IsString()
  cnpj?: string
 
  @IsOptional()
  @IsString()
  telefone?: string
 
  @IsOptional()
  @IsEmail()
  email?: string
 
  @IsOptional()
  @IsObject()
  regraPrazo?: Record<string, any> // { tipo: "dias", valor: 30 } ou { tipo: "dia_mes", dia: 20 }
}