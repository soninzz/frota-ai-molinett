import { Injectable, Logger } from '@nestjs/common'

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
      const res = await fetch(`${BCB_SGS}.${codigo}/dados/ultimos/1?formato=json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const dados = (await res.json()) as { data: string; valor: string }[]
      return { data: dados[0].data, valor: parseFloat(dados[0].valor) }
    } catch (e) {
      this.logger.warn(`BCB SGS série ${codigo} indisponível (${(e as Error).message}) — usando fallback`)
      // Fallback conservador caso o BCB esteja fora do ar (≈13% a.a.)
      return { data: 'fallback', valor: 0.0485 }
    }
  }
}
