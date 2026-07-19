import { SetMetadata } from '@nestjs/common'

export const ACAO_KEY = 'acao'

// Verbo de uma rota (LER/ESCREVER/APROVAR/CONFIGURAR), pra permitir override
// granular de RBAC via RegraPermissaoAcao — camada ADITIVA em cima do
// @Recurso() existente, que continua controlando o acesso ao recurso
// inteiro do jeito que sempre controlou. Sem esse decorator numa rota, só
// a checagem antiga (@Roles + @Recurso) vale — comportamento anterior
// preservado por padrão.
export const Acao = (acao: 'LER' | 'ESCREVER' | 'APROVAR' | 'CONFIGURAR') => SetMetadata(ACAO_KEY, acao)
