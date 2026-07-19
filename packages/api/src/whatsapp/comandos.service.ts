import { Injectable } from '@nestjs/common'
import { FinanceiroService } from '../financeiro/financeiro.service'
import { CotacaoService } from '../cotacao/cotacao.service'
import { FrotaService } from '../frota/frota.service'
import { ComissoesService } from '../jornada/comissoes.service'

export interface ComandoResultado {
  comando: string | null
  resposta: string
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Parser de comandos de chat (S02) ──────────────────────────────
// Critérios de sucesso §2.3 exige ≥8 comandos de consulta/ação por chat.
// Independe do canal WhatsApp estar conectado — essa é a lógica de
// interpretação em si, testável via POST /whatsapp/comando mesmo sem
// webhook nenhum plugado. Regras por palavra-chave (não NLU/LLM) de
// propósito: são consultas objetivas de negócio, onde previsibilidade
// importa mais que flexibilidade de linguagem — errar a intenção de
// "saldo" custa uma resposta errada pro atendimento.
//
// Comandos de ESCRITA (ex: aprovar cotação) foram deixados de fora
// nesta primeira leva — executar uma ação financeira a partir de texto
// livre sem tela de confirmação tem risco real de má-interpretação;
// prefiro entregar os 8 de consulta prontos e testados a arriscar um
// comando de ação mal calibrado.
@Injectable()
export class ComandosWhatsappService {
  constructor(
    private financeiro: FinanceiroService,
    private cotacao: CotacaoService,
    private frota: FrotaService,
    private comissoes: ComissoesService,
  ) {}

  async processar(textoOriginal: string): Promise<ComandoResultado> {
    // Normaliza acento (NFD + remove marcas diacríticas) — "cotações",
    // "aprovações", "comissões" viram "cotacoes"/"aprovacoes"/"comissoes",
    // sem precisar acertar manualmente qual vogal leva til/cedilha em cada
    // variação de plural (bug real encontrado ao testar: "õ" não é "ã").
    const texto = textoOriginal
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')

    if (/\bsaldo\b/.test(texto)) return this.saldoARecuperar()
    if (/\bmeta\b/.test(texto)) return this.metaDoMes()
    if (/cotac(ao|oes)\s+(em\s+)?abert/.test(texto)) return this.cotacoesAbertas()
    if (/aprovac(ao|oes)\s+pendent/.test(texto) || /pendente(s)?\s+de\s+aprova/.test(texto))
      return this.aprovacoesPendentes()
    if (/veiculo(s)?\s+com\s+alerta/.test(texto)) return this.veiculosComAlerta()
    if (/comiss(ao|oes)\s+pendent/.test(texto)) return this.comissoesPendentes()
    if (/venc(imento)?(s)?/.test(texto) && !/atrasad/.test(texto)) return this.proximosVencimentos()
    if (/atrasad/.test(texto)) return this.contasAtrasadas()

    return {
      comando: null,
      resposta:
        'Não entendi. Comandos disponíveis: saldo, meta do mês, cotações abertas, ' +
        'aprovações pendentes, veículos com alerta, comissões pendentes, vencimentos, atrasados.',
    }
  }

  private async saldoARecuperar(): Promise<ComandoResultado> {
    const painel = await this.financeiro.getPainelFinanceiro()
    return {
      comando: 'saldo',
      resposta: `Saldo a recuperar: ${fmt(painel.saldoARecuperar)}.`,
    }
  }

  private async metaDoMes(): Promise<ComandoResultado> {
    const painel = await this.financeiro.getPainelFinanceiro()
    const entradas = painel.fluxo30dias.totais.entradas
    const meta = painel.metas.faturamentoMinimo
    const pct = meta > 0 ? Math.min(100, Math.round((entradas / meta) * 100)) : 0
    return {
      comando: 'meta',
      resposta: `Meta do mês: ${fmt(meta)} de faturamento mínimo, ${painel.metas.kmMaximo} km máximo. ${pct}% já atingido (${fmt(entradas)} nos próximos 30 dias).`,
    }
  }

  private async cotacoesAbertas(): Promise<ComandoResultado> {
    const { cotacoes } = await this.cotacao.listar(1, 200)
    const abertas = cotacoes.filter((c: any) => c.status === 'ABERTA').length
    return { comando: 'cotacoes_abertas', resposta: `${abertas} cotação(ões) em aberto.` }
  }

  private async aprovacoesPendentes(): Promise<ComandoResultado> {
    const pendentes = await this.cotacao.listarPendentesAprovacao()
    if (pendentes.length === 0) return { comando: 'aprovacoes_pendentes', resposta: 'Nenhuma cotação pendente de aprovação.' }
    const linhas = pendentes
      .slice(0, 5)
      .map((c: any) => `#${c.numero ?? c.id} — margem ${c.margemPct}% (${c.origem} → ${c.destino})`)
      .join('\n')
    return {
      comando: 'aprovacoes_pendentes',
      resposta: `${pendentes.length} cotação(ões) pendente(s) de aprovação:\n${linhas}`,
    }
  }

  private async veiculosComAlerta(): Promise<ComandoResultado> {
    const painel = await this.frota.getPainelPrincipal()
    const comAlerta = painel.filter(
      (v: any) => v.alertas.revisoesCriticas > 0 || v.alertas.documentosAVencer > 0 || v.alertas.segurosAVencer > 0,
    )
    if (comAlerta.length === 0) return { comando: 'veiculos_alerta', resposta: 'Nenhum veículo com alerta pendente.' }
    const placas = comAlerta.map((v: any) => v.placa).join(', ')
    return {
      comando: 'veiculos_alerta',
      resposta: `${comAlerta.length} veículo(s) com alerta: ${placas}.`,
    }
  }

  private async comissoesPendentes(): Promise<ComandoResultado> {
    const pendentes = await this.comissoes.listar({ pago: false })
    const total = pendentes.reduce((acc: number, c: any) => acc + c.valor, 0)
    return {
      comando: 'comissoes_pendentes',
      resposta: `${pendentes.length} comissão(ões) pendente(s) de pagamento, total ${fmt(total)}.`,
    }
  }

  private async proximosVencimentos(): Promise<ComandoResultado> {
    const painel = await this.financeiro.getPainelFinanceiro()
    return {
      comando: 'vencimentos',
      resposta: `A vencer em 7 dias: ${painel.alertas.aVencer7dias.total} conta(s), ${fmt(painel.alertas.aVencer7dias.valor)}. Em 30 dias: ${painel.alertas.aVencer30dias.total} conta(s), ${fmt(painel.alertas.aVencer30dias.valor)}.`,
    }
  }

  private async contasAtrasadas(): Promise<ComandoResultado> {
    const painel = await this.financeiro.getPainelFinanceiro()
    return {
      comando: 'atrasados',
      resposta: `${painel.alertas.atrasados.total} conta(s) atrasada(s), total ${fmt(painel.alertas.atrasados.valor)}.`,
    }
  }
}
