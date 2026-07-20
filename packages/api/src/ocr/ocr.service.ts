import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { decodificarChaveNFCe, ChaveDecodificada } from './nfce-chave.util'
import { PrismaService } from '../database/prisma.service'
import { AuditoriaService } from '../common/auditoria/auditoria.service'
import { LlmService } from '../common/llm/llm.service'

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

export interface LeituraNotaOficina {
  oficina: string | null
  placa: string | null
  itens: { descricao: string; quantidade: number; valorUnitario: number | null }[]
  valorTotal: number | null
  prazoEstimadoDias: number | null
  confianca: number
  precisaConfirmacaoHumana: boolean
  fonte: Provedor
  veiculoSugerido: { id: string; placa: string } | null
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

const PROMPT_NOTA_OFICINA =
  'Leia esta foto de um orçamento/nota de oficina mecânica. Extraia: nome da oficina, placa do ' +
  'veículo (se visível), lista de itens/serviços com descrição e valor unitário, valor total, e ' +
  'prazo estimado em dias (se mencionado). Responda APENAS com JSON, sem texto extra: ' +
  '{"oficina": string|null, "placa": string|null, "itens": [{"descricao": string, "quantidade": ' +
  'number, "valorUnitario": number|null}], "valorTotal": number|null, "prazoEstimadoDias": ' +
  'number|null, "confianca": 0-1}'

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
    private auditoria: AuditoriaService,
    private llm: LlmService,
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
  async confirmarHodometro(veiculoId: string, kmHodometro: number, confianca?: number, fonte?: string, usuarioId?: string) {
    const veiculo = await this.prisma.veiculo.findUnique({ where: { id: veiculoId } })
    if (!veiculo) throw new NotFoundException('Veículo não encontrado')

    if (veiculo.kmAtual !== null && kmHodometro < veiculo.kmAtual) {
      throw new BadRequestException(
        `Km informado (${kmHodometro}) é menor que o km atual registrado (${veiculo.kmAtual}) — confirme a leitura antes de gravar.`,
      )
    }

    const atualizado = await this.prisma.veiculo.update({
      where: { id: veiculoId },
      data: {
        kmAtual: kmHodometro,
        kmAtualEm: new Date(),
        kmAtualFonte: fonte ?? this.provedor,
      },
      select: { id: true, placa: true, kmAtual: true, kmAtualEm: true },
    })

    if (usuarioId) {
      await this.auditoria.registrar({
        usuarioId,
        entidade: 'Veiculo',
        registroId: veiculoId,
        acao: 'CONFIRMAR_HODOMETRO',
        antes: { kmAtual: veiculo.kmAtual },
        depois: { kmAtual: kmHodometro, confianca, fonte: fonte ?? this.provedor },
      })
    }

    return atualizado
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

  // ── Leitura de nota/orçamento de oficina (foto) ──
  // Só extrai — NÃO cria a OS sozinha. O item extraído (peças/valores) segue
  // pro mesmo padrão "ler → humano confirma → grava" já usado em hodômetro/
  // cupom: quem chama essa leitura mostra os campos extraídos pro usuário
  // revisar/corrigir e só então chama POST /manutencao/os com os itens, que
  // aí sim cria a OS de verdade (guardrail: nunca commitar valor financeiro
  // direto da leitura de IA sem revisão humana).
  async lerNotaOficina(imagemBase64: string, mimeType = 'image/jpeg'): Promise<LeituraNotaOficina> {
    if (this.modoOcr !== 'live') return this.mockNotaOficina()
    try {
      const r = await this.chamarIA(imagemBase64, mimeType, PROMPT_NOTA_OFICINA)
      const confianca = typeof r.confianca === 'number' ? r.confianca : 0
      await this.prisma.integracaoLog.create({
        data: { fonte: `ocr_${this.provedor}`, status: 'OK', detalhes: `nota de oficina, confiança ${confianca}` },
      })
      const veiculoSugerido = await this.sugerirVeiculoPorPlaca(r.placa ?? null)
      const itens = Array.isArray(r.itens)
        ? r.itens.map((i: any) => ({
            descricao: String(i.descricao ?? ''),
            quantidade: typeof i.quantidade === 'number' && i.quantidade > 0 ? i.quantidade : 1,
            valorUnitario: typeof i.valorUnitario === 'number' ? i.valorUnitario : null,
          }))
        : []
      return {
        oficina: r.oficina ?? null,
        placa: r.placa ?? null,
        itens,
        valorTotal: typeof r.valorTotal === 'number' ? r.valorTotal : null,
        prazoEstimadoDias: typeof r.prazoEstimadoDias === 'number' ? r.prazoEstimadoDias : null,
        confianca,
        precisaConfirmacaoHumana: confianca < LIMIAR_CONFIANCA,
        fonte: this.provedor,
        veiculoSugerido,
      }
    } catch (e) {
      this.logger.error(`Falha na leitura da nota de oficina via ${this.provedor}`, e)
      await this.prisma.integracaoLog.create({
        data: { fonte: `ocr_${this.provedor}`, status: 'ERRO', erro: (e as Error).message },
      })
      return {
        oficina: null,
        placa: null,
        itens: [],
        valorTotal: null,
        prazoEstimadoDias: null,
        confianca: 0,
        precisaConfirmacaoHumana: true,
        fonte: this.provedor,
        veiculoSugerido: null,
      }
    }
  }

  private async sugerirVeiculoPorPlaca(placa: string | null) {
    if (!placa) return null
    // Placa no banco já vem no formato Mercosul com hífen (ex: "MHG-1A49"),
    // igual o que a IA normalmente lê da nota — comparação direta (sem
    // stripar caracteres, que quebrava o match tirando o hífen só de um lado).
    const veiculo = await this.prisma.veiculo.findFirst({
      where: { ativo: true, placa: { equals: placa.trim(), mode: 'insensitive' } },
      select: { id: true, placa: true },
    })
    if (veiculo) return veiculo

    // Fallback: a IA pode ler sem hífen ou com formato antigo — tenta por
    // substring dos alfanuméricos em ambos os sentidos.
    const somenteAlfanumerico = placa.replace(/[^A-Z0-9]/gi, '')
    if (somenteAlfanumerico.length < 4) return null
    const candidatos = await this.prisma.veiculo.findMany({
      where: { ativo: true },
      select: { id: true, placa: true },
    })
    return candidatos.find((v) => v.placa.replace(/[^A-Z0-9]/gi, '').toUpperCase() === somenteAlfanumerico.toUpperCase()) ?? null
  }

  private mockNotaOficina(): LeituraNotaOficina {
    this.logger.debug('OCR_MODE!=live — nota de oficina precisa de confirmação manual')
    return {
      oficina: null,
      placa: null,
      itens: [],
      valorTotal: null,
      prazoEstimadoDias: null,
      confianca: 0,
      precisaConfirmacaoHumana: true,
      fonte: 'mock',
      veiculoSugerido: null,
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

  // GEMINI_MODEL fica configurável de propósito — a nomenclatura dos modelos
  // Gemini muda com frequência e não dá pra garantir aqui qual é o nome exato
  // vigente da versão "Flash" pedida pelo cliente; confirmar o ID certo em
  // ai.google.dev/gemini-api/docs/models antes de virar OCR_MODE=live.
  private async chamarIA(imagemBase64: string, mimeType: string, prompt: string): Promise<any> {
    return this.llm.completar({ prompt, imagemBase64, mimeType, json: true })
  }
}
