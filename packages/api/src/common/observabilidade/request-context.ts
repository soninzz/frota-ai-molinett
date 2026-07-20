import { AsyncLocalStorage } from 'node:async_hooks'

interface ContextoRequisicao {
  correlationId: string
}

const storage = new AsyncLocalStorage<ContextoRequisicao>()

export const RequestContext = {
  run<T>(contexto: ContextoRequisicao, fn: () => T): T {
    return storage.run(contexto, fn)
  },
  getCorrelationId(): string | undefined {
    return storage.getStore()?.correlationId
  },
}
