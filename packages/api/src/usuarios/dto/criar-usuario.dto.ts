import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator'
import { Perfil } from '@prisma/client'

export class CriarUsuarioDto {
  @IsString()
  nome: string

  @IsEmail()
  email: string

  @IsEnum(Perfil)
  perfil: Perfil

  @IsOptional()
  @IsString()
  whatsappNumero?: string
}
