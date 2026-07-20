import { Injectable, Logger } from '@nestjs/common'
import { CategoriaAlerta, Perfil } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { AlertasService } from '../alertas/alertas.service'

export interface ResultadoCaptacao {
  capturado: boolean
  palavraChave: string | null
}

// ── Captação de pedido por palavra-chave em grupo do WhatsApp (S02) ──
// Diferente do ComandosWhatsappService (que responde consulta 1:1 pra quem
// já está no sistema), isso aqui monitora mensagem de GRUPO — cliente
// avisando "preciso de guincho" num grupo com o atendimento, texto solto,
// sem estrutura nenhuma. De propósito, essa captação NÃO cria Cotação
// sozinha: extrair origem/destino/veículo de texto livre de forma confiável
// exigiria NLU de verdade (não regex), e criar uma cotação errada é pior que
// não criar nenhuma — mesmo raciocínio já usado pra excluir comandos de
// ESCRITA do parser 1:1 (risco real de má-interpretação numa ação com
// consequência financeira). Em vez disso, dispara alerta pro atendimento
// revisar e criar a cotação manualmente — reduz o risco de perder o pedido
// no meio da conversa do grupo sem inventar dado.
const PALAVRAS_CHAVE = [
  'guincho',
  'reboque',
  'socorro',
  'pane',
  'quebrou',
  'acidente',
  'preciso de transporte',
  'preciso de um guincho',
  'solicito',
  'pedido de guincho',
  'carreta parada',
  'caminhao parado',
  'veiculo parado',
]

@Injectable()
export class CaptacaoGrupoService {
  private readonly logger = new Logger(CaptacaoGrupoService.name)

  constructor(
    private prisma: PrismaService,
    private alertas: AlertasService,
  ) {}

  async processarMensagemGrupo(grupoNome: string, autor: string, textoOriginal: string): Promise<ResultadoCaptacao> {
    const texto = textoOriginal
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')

    const palavraChave = PALAVRAS_CHAVE.find((p) => texto.includes(p))
    if (!palavraChave) return { capturado: false, palavraChave: null }

    await this.garantirRegra()
    await this.alertas.disparar({
      categoria: CategoriaAlerta.COMERCIAL,
      evento: 'whatsapp_captacao_pedido',
      mensagem: `Possível pedido captado no grupo "${grupoNome}" (${autor}): "${textoOriginal}"`,
      contexto: { grupoNome, autor, texto: textoOriginal, palavraChaveDetectada: palavraChave },
    })
    this.logger.log(`Captação de pedido: grupo "${grupoNome}", palavra-chave "${palavraChave}"`)

    return { capturado: true, palavraChave }
  }

  private async garantirRegra() {
    const existente = await this.prisma.regraAlerta.findFirst({ where: { evento: 'whatsapp_captacao_pedido' } })
    if (!existente) {
      await this.prisma.regraAlerta.create({
        data: {
          categoria: CategoriaAlerta.COMERCIAL,
          evento: 'whatsapp_captacao_pedido',
          descricao: 'Possível pedido de serviço captado por palavra-chave em grupo do WhatsApp',
          destinatariosPerfis: [Perfil.ATENDIMENTO, Perfil.OPERACIONAL],
          canal: 'PAINEL',
        },
      })
    }
  }
}
