// Retry com backoff exponencial pra chamadas a APIs externas instáveis
// (rastreadores, OCR, BCB). NÃO usar em endpoints não-idempotentes que
// consomem fila (ex: /integracao/posicoes do Assemilsat) — lá um retry
// silencioso perderia posições. Usar só em GET/consulta ou endpoints
// confirmadamente idempotentes.
export async function fetchComRetry(
  url: string,
  options: RequestInit,
  tentativas = 3,
  timeoutMs = 10_000,
): Promise<Response> {
  let ultimoErro: unknown

  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeout)

      // 5xx e 429 valem retry — erro do lado do servidor/rate limit,
      // não adianta insistir em 4xx de cliente (auth, payload etc).
      if (response.status >= 500 || response.status === 429) {
        throw new Error(`HTTP ${response.status}`)
      }
      return response
    } catch (e) {
      clearTimeout(timeout)
      ultimoErro = e
      if (tentativa < tentativas) {
        const esperaMs = 500 * 2 ** (tentativa - 1) // 500ms, 1s, 2s...
        await new Promise((resolve) => setTimeout(resolve, esperaMs))
      }
    }
  }

  throw ultimoErro instanceof Error ? ultimoErro : new Error(String(ultimoErro))
}
