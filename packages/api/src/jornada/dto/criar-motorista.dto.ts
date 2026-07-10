import { IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
 
export class CriarMotoristaDto {
  // Dados do usuário (login)
  @IsString()
  nome: string
 
  @IsEmail()
  email: string
 
  @IsOptional()
  @IsString()
  whatsappNumero?: string
 
  // Dados do motorista
  @IsString()
  cpf: string
 
  @IsString()
  cnh: string
 
  @IsIn(['A', 'B', 'C', 'D', 'E'])
  cnhCategoria: string
 
  @IsDateString()
  cnhVencimento: string
 
  @IsOptional()
  @IsDateString()
  toxicologicoVencimento?: string
 
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  comissaoPct?: number
}