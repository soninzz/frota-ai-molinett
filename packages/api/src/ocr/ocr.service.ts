import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { decodificarChaveNFCe, ChaveDecodificada } from './nfce-chave.util'

export interface LeituraHodometro {
  odometroKm: number | null
  confianca: number
  modeloPainel: string | null
  precisaConfirmacaoHumana: boolean
  fonte: 'mock' | 'anthropic'
}

export interface LeituraCupom {
  postoNome: string | null
  volumeLitros: number | null
  valorTotal: number | null
  precoPorLitro: number | null
  confianca: number
  precisaConfirmacaoHumana: boolean
  fonte: 'mock' | 'anthropic'
}

const PROMPT_HODOMETRO =
  'Leia SOMENTE o hodômetro (km) deste painel de caminhão. Identifique o modelo do painel ' +
  'se possível. Responda JSON: {"odometro_km": int, "confianca": 0-1, "modelo_painel": string}'

const PROMPT_CUPOM =
  'Leia este cupom fiscal de abastecimento de diesel. Extraia nome do posto, volume em litros, ' +
  'valor total pago e preço por litro. Responda JSON: {"posto_nome": string, "volume_litros": ' +
  'float, "valor_total": float, "preco_por_litro": float, "confianca": 0-1}'

const LIMIAR_CONFIANCA = 0.7

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name)
  private readonly modo: string

  constructor(private config: ConfigService) {
    this.modo = this.config.get<string>('OCR_MODE', 'mock')
  }

  // ── Chave/QR Code da NFC-e — funciona sem chave de IA nenhuma ──
  lerQrCodeCupom(conteudoQrCode: string): {
    chaveDecodificada: ChaveDecodificada | null
    mensagem: string
  } {
    const decodificada = decodificarChaveNFCe(conteudoQrCode)
    if (!decodificada) {
      return { chaveDecodificada: null, mensagem: 'QR Code não contém uma chave de acesso válida (44 dígitos).' }
    }
    if (!decodificada.valida) {
      return {
        chaveDecodificada: decodificada,
        mensagem: 'Chave decodificada, mas o dígito verificador não confere — pode estar corrompida.',
      }
    }
    return {
      chaveDecodificada: decodificada,
      mensagem:
        'Chave válida. CNPJ do emitente e data de emissão extraídos direto da chave (sem consulta externa). ' +
        'Valor e itens da nota exigem certificado e-CNPJ (NFeDistribuicaoDFe) ou confirmação manual — ' +
        'o portal público de consulta da SEFAZ-SC tem proteção anti-bot e não pode ser raspado de forma confiável.',
    }
  }

  // ── OCR do hodômetro (foto do painel) ──
  async lerHodometro(imagemBase64: string, mimeType = 'image/jpeg'): Promise<LeituraHodometro> {
    if (this.modo !== 'live') {
      return this.mockHodometro()
    }
    return this.lerHodometroAnthropic(imagemBase64, mimeType)
  }

  // ── OCR do cupom fiscal (fallback quando QR Code está ilegível/rasgado) ──
  async lerCupom(imagemBase64: string, mimeType = 'image/jpeg'): Promise<LeituraCupom> {
    if (this.modo !== 'live') {
      return this.mockCupom()
    }
    return this.lerCupomAnthropic(imagemBase64, mimeType)
  }

  private mockHodometro(): LeituraHodometro {
    this.logger.debug('OCR_MODE!=live — hodômetro precisa de confirmação manual')
    return { odometroKm: null, confianca: 0, modeloPainel: null, precisaConfirmacaoHumana: true, fonte: 'mock' }
  }

  private mockCupom(): LeituraCupom {
    this.logger.debug('OCR_MODE!=live — cupom precisa de confirmação manual')
    return {
      postoNome: null,
      volumeLitros: null,
      valorTotal: null,
      precoPorLitro: null,
      confianca: 0,
      precisaConfirmacaoHumana: true,
      fonte: 'mock',
    }
  }

  private async chamarAnthropic(imagemBase64: string, mimeType: string, prompt: string): Promise<any> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('OCR_MODE=live mas ANTHROPIC_API_KEY não está configurada')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: imagemBase64 } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API retornou ${response.status}: ${await response.text()}`)
    }

    const dados = await response.json()
    const texto = dados.content?.[0]?.text ?? '{}'
    const jsonMatch = texto.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  }

  private async lerHodometroAnthropic(imagemBase64: string, mimeType: string): Promise<LeituraHodometro> {
    try {
      const r = await this.chamarAnthropic(imagemBase64, mimeType, PROMPT_HODOMETRO)
      const confianca = typeof r.confianca === 'number' ? r.confianca : 0
      return {
        odometroKm: typeof r.odometro_km === 'number' ? r.odometro_km : null,
        confianca,
        modeloPainel: r.modelo_painel ?? null,
        precisaConfirmacaoHumana: confianca < LIMIAR_CONFIANCA,
        fonte: 'anthropic',
      }
    } catch (e) {
      this.logger.error('Falha na leitura do hodômetro via Anthropic', e)
      return { odometroKm: null, confianca: 0, modeloPainel: null, precisaConfirmacaoHumana: true, fonte: 'anthropic' }
    }
  }

  private async lerCupomAnthropic(imagemBase64: string, mimeType: string): Promise<LeituraCupom> {
    try {
      const r = await this.chamarAnthropic(imagemBase64, mimeType, PROMPT_CUPOM)
      const confianca = typeof r.confianca === 'number' ? r.confianca : 0
      return {
        postoNome: r.posto_nome ?? null,
        volumeLitros: typeof r.volume_litros === 'number' ? r.volume_litros : null,
        valorTotal: typeof r.valor_total === 'number' ? r.valor_total : null,
        precoPorLitro: typeof r.preco_por_litro === 'number' ? r.preco_por_litro : null,
        confianca,
        precisaConfirmacaoHumana: confianca < LIMIAR_CONFIANCA,
        fonte: 'anthropic',
      }
    } catch (e) {
      this.logger.error('Falha na leitura do cupom via Anthropic', e)
      return {
        postoNome: null,
        volumeLitros: null,
        valorTotal: null,
        precoPorLitro: null,
        confianca: 0,
        precisaConfirmacaoHumana: true,
        fonte: 'anthropic',
      }
    }
  }
}
