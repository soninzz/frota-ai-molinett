import { IsString, IsOptional, IsObject } from 'class-validator'
 
export class CriarAlertaDto {
  @IsString()
  categoria: string // "FINANCEIRO" | "OPERACIONAL" | "MANUTENCAO" | "COMERCIAL" | "COMPLIANCE"
 
  @IsString()
  evento: string // ex: "OS_CANCELADA", "COTACAO_PENDENTE_APROVACAO"
 
  @IsString()
  mensagem: string
 
  @IsOptional()
  @IsObject()
  contexto?: Record<string, any> // dados extras (ex: { osId, valor })
}