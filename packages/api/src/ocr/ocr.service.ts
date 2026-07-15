import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { decodificarChaveNFCe, ChaveDecodificada } from './nfce-chave.util'
import { fetchComRetry } from '../common/fetch-retry.util'
import { PrismaService } from '../database/prisma.service'

type Provedor = 'mock' | 'gemini' | 'anthropic'

export interface LeituraHodometro {
  odometroKm: number | null
  confianca: number
  modeloPainel: string | null
  precisaConfirmacaoHumana: boolean
  fonte: Provedor
  veiculosSugeridos: { id: string; placa: string; marca: string; modelo: string }[]
}

export interface LeituraCupom {
  postoNome: string | null
  volumeLitros: number | null
  valorTotal: number | null
  precoPorLitro: number | null
  confianca: number
  precisaConfirmacaoHumana: boolean
  fonte: Provedor
}

const PROMPT_HODOMETRO =
  'Leia SOMENTE o hodômetro (km) deste painel de caminhão. Identifique o modelo do painel, ' +
  'e se possível a MARCA do veículo (ex: Volvo, Mercedes-Benz, Volkswagen, MAN, Scania) ' +
  'pelo design do painel/instrumentos. Responda APENAS com JSON, sem texto extra: ' +
  '{"odometro_km": int, "confianca": 0-1, "modelo_painel": string, "marca_veiculo": string|null}'

const PROMPT_CUPOM =
  'Leia este cupom fiscal de abastecimento de diesel. Extraia nome do posto, volume em litros, ' +
  'valor total pago e preço por litro. Responda APENAS com JSON, sem texto extra: ' +
  '{"posto_nome": string, "volume_litros": float, "valor_total": float, "preco_por_litro": float, "confianca": 0-1}'

const LIMIAR_CONFIANCA = 0.7

// Adaptador de provedor de IA multimodal — troca de Gemini pra Anthropic (ou
// qualquer outro) mudando só LLM_PROVIDER no .env, sem reescrever quem chama.
// Gemini é o padrão porque foi o provedor pedido pelo cliente (Gemini Flash).
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name)
  private readonly modoOcr: string
  private readonly provedor: Provedor

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.modoOcr = this.config.get<string>('OCR_MODE', 'mock')
    this.provedor = this.config.get<Provedor>('LLM_PROVIDER', 'gemini')
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
    if (this.modoOcr !== 'live') return this.mockHodometro()
    try {
      const r = await this.chamarIA(imagemBase64, mimeType, PROMPT_HODOMETRO)
      const confianca = typeof r.confianca === 'number' ? r.confianca : 0
      await this.prisma.integracaoLog.create({
        data: { fonte: `ocr_${this.provedor}`, status: 'OK', detalhes: `hodômetro, confiança ${confianca}` },
      })
      const veiculosSugeridos = await this.sugerirVeiculosPorMarca(r.marca_veiculo ?? null)
      return {
        odometroKm: typeof r.odometro_km === 'number' ? r.odometro_km : null,
        confianca,
        modeloPainel: r.modelo_painel ?? null,
        precisaConfirmacaoHumana: confianca < LIMIAR_CONFIANCA,
        fonte: this.provedor,
        veiculosSugeridos,
      }
    } catch (e) {
      this.logger.error(`Falha na leitura do hodômetro via ${this.provedor}`, e)
      await this.prisma.integracaoLog.create({
        data: { fonte: `ocr_${this.provedor}`, status: 'ERRO', erro: (e as Error).message },
      })
      return {
        odometroKm: null,
        confianca: 0,
        modeloPainel: null,
        precisaConfirmacaoHumana: true,
        fonte: this.provedor,
        veiculosSugeridos: [],
      }
    }
  }

  // Identificação de veículo pelo painel — NÃO substitui a seleção manual do
  // motorista/operador, é só sugestão pra reduzir erro quando esquecem de
  // selecionar o veículo certo. Casa por marca (única info confiável que a
  // IA consegue inferir do design do painel); desempata mostrando todos os
  // veículos ativos daquela marca pro humano escolher.
  private async sugerirVeiculosPorMarca(marca: string | null) {
    if (!marca) return []
    const veiculos = await this.prisma.veiculo.findMany({
      where: { ativo: true, marca: { contains: marca, mode: 'insensitive' } },
      select: { id: true, placa: true, marca: true, modelo: true },
    })
    return veiculos
  }

  // ── Confirma a leitura do hodômetro e grava como km oficial do veículo ──
  // Guardrail 3: hodômetro (OCR ou correção manual) é a ÚNICA fonte de km
  // usada pra revisão/custo — o rastreador nunca escreve aqui. Km decrescente
  // vira BadRequestException (some/erro de leitura), nunca é aceito silencioso.
  async confirmarHodometro(veiculoId: string, kmHodometro: number, confianca?: number, fonte?: string) {
    const veiculo = await this.prisma.veiculo.findUnique({ where: { id: veiculoId } })
    if (!veiculo) throw new NotFoundException('Veículo não encontrado')

    if (veiculo.kmAtual !== null && kmHodometro < veiculo.kmAtual) {
      throw new BadRequestException(
        `Km informado (${kmHodometro}) é menor que o km atual registrado (${veiculo.kmAtual}) — confirme a leitura antes de gravar.`,
      )
    }

    return this.prisma.veiculo.update({
      where: { id: veiculoId },
      data: {
        kmAtual: kmHodometro,
        kmAtualEm: new Date(),
        kmAtualFonte: fonte ?? this.provedor,
      },
      select: { id: true, placa: true, kmAtual: true, kmAtualEm: true },
    })
  }

  // ── OCR do cupom fiscal (fallback quando QR Code está ilegível/rasgado) ──
  async lerCupom(imagemBase64: string, mimeType = 'image/jpeg'): Promise<LeituraCupom> {
    if (this.modoOcr !== 'live') return this.mockCupom()
    try {
      const r = await this.chamarIA(imagemBase64, mimeType, PROMPT_CUPOM)
      const confianca = typeof r.confianca === 'number' ? r.confianca : 0
      await this.prisma.integracaoLog.create({
        data: { fonte: `ocr_${this.provedor}`, status: 'OK', detalhes: `cupom, confiança ${confianca}` },
      })
      return {
        postoNome: r.posto_nome ?? null,
        volumeLitros: typeof r.volume_litros === 'number' ? r.volume_litros : null,
        valorTotal: typeof r.valor_total === 'number' ? r.valor_total : null,
        precoPorLitro: typeof r.preco_por_litro === 'number' ? r.preco_por_litro : null,
        confianca,
        precisaConfirmacaoHumana: confianca < LIMIAR_CONFIANCA,
        fonte: this.provedor,
      }
    } catch (e) {
      this.logger.error(`Falha na leitura do cupom via ${this.provedor}`, e)
      await this.prisma.integracaoLog.create({
        data: { fonte: `ocr_${this.provedor}`, status: 'ERRO', erro: (e as Error).message },
      })
      return {
        postoNome: null,
        volumeLitros: null,
        valorTotal: null,
        precoPorLitro: null,
        confianca: 0,
        precisaConfirmacaoHumana: true,
        fonte: this.provedor,
      }
    }
  }

  private mockHodometro(): LeituraHodometro {
    this.logger.debug('OCR_MODE!=live — hodômetro precisa de confirmação manual')
    return {
      odometroKm: null,
      confianca: 0,
      modeloPainel: null,
      precisaConfirmacaoHumana: true,
      fonte: 'mock',
      veiculosSugeridos: [],
    }
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

  // ── Dispatch por provedor ──
  private async chamarIA(imagemBase64: string, mimeType: string, prompt: string): Promise<any> {
    if (this.provedor === 'anthropic') return this.chamarAnthropic(imagemBase64, mimeType, prompt)
    return this.chamarGemini(imagemBase64, mimeType, prompt)
  }

  // GEMINI_MODEL fica configurável de propósito — a nomenclatura dos modelos
  // Gemini muda com frequência e não dá pra garantir aqui qual é o nome exato
  // vigente da versão "Flash" pedida pelo cliente; confirmar o ID certo em
  // ai.google.dev/gemini-api/docs/models antes de virar OCR_MODE=live.
  private async chamarGemini(imagemBase64: string, mimeType: string, prompt: string): Promise<any> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('OCR_MODE=live com LLM_PROVIDER=gemini mas GEMINI_API_KEY não está configurada')
    }
    const model = this.config.get<string>('GEMINI_MODEL', 'gemini-2.5-flash')

    const response = await fetchComRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: imagemBase64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { response_mime_type: 'application/json' },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini API (${model}) retornou ${response.status}: ${await response.text()}`)
    }

    const dados = await response.json()
    const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    return JSON.parse(texto)
  }

  private async chamarAnthropic(imagemBase64: string, mimeType: string, prompt: string): Promise<any> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('OCR_MODE=live com LLM_PROVIDER=anthropic mas ANTHROPIC_API_KEY não está configurada')
    }

    const response = await fetchComRetry('https://api.anthropic.com/v1/messages', {
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
}
