import { Injectable, Logger } from '@nestjs/common'
import { fetchComRetry } from '../common/fetch-retry.util'
import { PrismaService } from '../database/prisma.service'

// Fontes públicas de taxas (sem credencial) — BCB SGS.
// CDI = série 12, Selic over = série 11 (taxas % ao dia útil).
const BCB_SGS = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs'
const DIAS_UTEIS_ANO = 252

export interface TaxasMercado {
  cdiDiaPct: number
  cdiAnualPct: number
  selicDiaPct: number
  selicAnualPct: number
  referencia: string
  fonte: string
}

@Injectable()
export class MercadoService {
  private readonly logger = new Logger(MercadoService.name)
  private cache: { taxas: TaxasMercado; em: number } | null = null

  constructor(private prisma: PrismaService) {}

  // Cache de 6h — as séries do BCB são diárias
  async taxas(): Promise<TaxasMercado> {
    if (this.cache && Date.now() - this.cache.em < 6 * 60 * 60 * 1000) {
      return this.cache.taxas
    }

    const [cdi, selic] = await Promise.all([this.serie(12), this.serie(11)])

    const taxas: TaxasMercado = {
      cdiDiaPct: cdi.valor,
      cdiAnualPct: this.anualizar(cdi.valor),
      selicDiaPct: selic.valor,
      selicAnualPct: this.anualizar(selic.valor),
      referencia: cdi.data,
      fonte: 'BCB SGS (séries 12 e 11)',
    }
    this.cache = { taxas, em: Date.now() }
    return taxas
  }

  private anualizar(taxaDiaPct: number): number {
    return +((Math.pow(1 + taxaDiaPct / 100, DIAS_UTEIS_ANO) - 1) * 100).toFixed(2)
  }

  private async serie(codigo: number): Promise<{ data: string; valor: number }> {
    try {
      const res = await fetchComRetry(`${BCB_SGS}.${codigo}/dados/ultimos/1?formato=json`, {})
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const dados = (await res.json()) as { data: string; valor: string }[]
      await this.prisma.integracaoLog.create({
        data: { fonte: 'bcb_sgs', status: 'OK', detalhes: `série ${codigo}, ref. ${dados[0].data}` },
      })
      return { data: dados[0].data, valor: parseFloat(dados[0].valor) }
    } catch (e) {
      this.logger.warn(`BCB SGS série ${codigo} indisponível (${(e as Error).message}) — usando fallback`)
      await this.prisma.integracaoLog.create({
        data: { fonte: 'bcb_sgs', status: 'DEGRADADO', erro: (e as Error).message, detalhes: 'usando fallback ~13% a.a.' },
      })
      // Fallback conservador caso o BCB esteja fora do ar (≈13% a.a.)
      return { data: 'fallback', valor: 0.0485 }
    }
  }
}
