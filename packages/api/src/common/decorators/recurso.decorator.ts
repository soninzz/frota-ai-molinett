import { SetMetadata } from '@nestjs/common'

export const RECURSO_KEY = 'recurso'

// Marca a qual "recurso" (módulo) uma rota pertence, pra permitir override
// de RBAC em runtime via RegraPermissao — sem isso, só o @Roles() hardcoded
// vale (comportamento anterior, preservado como padrão seguro).
export const Recurso = (nome: string) => SetMetadata(RECURSO_KEY, nome)
