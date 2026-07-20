import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { fetchComRetry } from '../fetch-retry.util'

type Provedor = 'gemini' | 'anthropic'

export interface PedidoLlm {
  prompt: string
  imagemBase64?: string
  mimeType?: string
  json?: boolean
}

// Adaptador de provedor de IA (texto e/ou imagem) — extraído do OcrService
// pra ser reaproveitado por qualquer módulo que precise de LLM (assistente de
// orçamento de peças, leitura de nota de oficina, etc.) sem duplicar a
// integração HTTP com Gemini/Anthropic. Mesmas env vars de sempre
// (LLM_PROVIDER/GEMINI_API_KEY/GEMINI_MODEL/ANTHROPIC_API_KEY).
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name)
  private readonly provedor: Provedor

  constructor(private config: ConfigService) {
    this.provedor = this.config.get<Provedor>('LLM_PROVIDER', 'gemini')
  }

  get provedorAtual(): Provedor {
    return this.provedor
  }

  async completar(pedido: PedidoLlm): Promise<any> {
    if (this.provedor === 'anthropic') return this.chamarAnthropic(pedido)
    return this.chamarGemini(pedido)
  }

  private async chamarGemini({ prompt, imagemBase64, mimeType, json }: PedidoLlm): Promise<any> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (!apiKey) throw new Error('LLM_PROVIDER=gemini mas GEMINI_API_KEY não está configurada')
    const model = this.config.get<string>('GEMINI_MODEL', 'gemini-2.5-flash')

    const parts: any[] = []
    if (imagemBase64) parts.push({ inline_data: { mime_type: mimeType ?? 'image/jpeg', data: imagemBase64 } })
    parts.push({ text: prompt })

    const response = await fetchComRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          ...(json ? { generationConfig: { response_mime_type: 'application/json' } } : {}),
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini API (${model}) retornou ${response.status}: ${await response.text()}`)
    }

    const dados = await response.json()
    const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text ?? (json ? '{}' : '')
    return json ? JSON.parse(texto) : texto
  }

  private async chamarAnthropic({ prompt, imagemBase64, mimeType, json }: PedidoLlm): Promise<any> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('LLM_PROVIDER=anthropic mas ANTHROPIC_API_KEY não está configurada')

    const content: any[] = []
    if (imagemBase64) content.push({ type: 'image', source: { type: 'base64', media_type: mimeType ?? 'image/jpeg', data: imagemBase64 } })
    content.push({ type: 'text', text: prompt })

    const response = await fetchComRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API retornou ${response.status}: ${await response.text()}`)
    }

    const dados = await response.json()
    const texto = dados.content?.[0]?.text ?? ''
    if (!json) return texto
    const jsonMatch = texto.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  }
}
