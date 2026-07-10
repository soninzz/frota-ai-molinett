import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string

  @IsString()
  @MinLength(6, { message: 'Senha muito curta' })
  senha: string
}