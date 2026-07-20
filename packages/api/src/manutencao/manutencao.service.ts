import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CriarOsManutencaoDto, AtualizarStatusOsDto } from './dto/manutencao.dto'
import { StatusOsManutencao } from '@prisma/client'
import { AuditoriaService } from '../common/auditoria/auditoria.service'
import { LlmService } from '../common/llm/llm.service'

@Injectable()
export class ManutencaoService {
  private readonly logger = new Logger(ManutencaoService.name)

  constructor(
    private prisma: PrismaService,
    private auditoria: AuditoriaService,
    private llm: LlmService,
  ) {}

  // `pecas` (opcional): vem tipicamente da leitura de nota de oficina via IA
  // (POST /ocr/nota-oficina) já revisada pelo usuário — cria a OS e os itens
  // extraídos numa transação só ("abre OS automaticamente" a partir da
  // leitura, sem precisar redigitar cada peça manualmente).
  async criarOs(dto: CriarOsManutencaoDto, usuarioId: string) {
    const criada = await this.prisma.$transaction(async (tx) => {
      const os = await tx.osManutencao.create({
        data: {
          veiculoId:      dto.veiculoId,
          solicitanteId:  usuarioId,
          descricao:      dto.descricao,
          prioridade:     dto.prioridade,
          subsistema:     dto.subsistema,
          oficina:        dto.oficina,
          valorEstimado:  dto.valorEstimado,
          prazoEstimado:  dto.prazoEstimado ? new Date(dto.prazoEstimado) : undefined,
          status:         StatusOsManutencao.SOLICITADO,
        },
        include: { veiculo: true },
      })

      if (dto.pecas?.length) {
        await tx.osManutencaoPeca.createMany({
          data: dto.pecas.map((p) => ({
            osId: os.id,
            descricao: p.descricao,
            quantidade: p.quantidade ?? 1,
            valorUnitario: p.valorUnitario,
          })),
        })
      }

      return os
    })

    await this.auditoria.registrar({
      usuarioId,
      entidade: 'OsManutencao',
      registroId: criada.id,
      acao: 'CRIAR',
      depois: { veiculoId: criada.veiculoId, descricao: criada.descricao, status: criada.status, pecas: dto.pecas?.length ?? 0 },
    })

    return criada
  }
 
  async listar(veiculoId?: string, status?: string) {
    return this.prisma.osManutencao.findMany({
      where: {
        ...(veiculoId && { veiculoId }),
        ...(status    && { status: status as StatusOsManutencao }),
      },
      orderBy: [
        { prioridade: 'asc' },
        { criadoEm:   'desc' },
      ],
      include: { veiculo: true },
    })
  }
 
  async atualizarStatus(id: string, dto: AtualizarStatusOsDto, usuarioId?: string) {
    const os = await this.prisma.osManutencao.findUnique({ where: { id } })
    if (!os) throw new NotFoundException('OS de manutenção não encontrada')

    const data: any = { status: dto.status }
    if (dto.valorReal)   data.valorReal   = dto.valorReal
    if (dto.observacao)  data.observacao  = dto.observacao
    if (dto.status === 'CONCLUIDO') data.concluidoEm = new Date()

    const atualizada = await this.prisma.osManutencao.update({ where: { id }, data })

    if (usuarioId) {
      await this.auditoria.registrar({
        usuarioId,
        entidade: 'OsManutencao',
        registroId: id,
        acao: 'ATUALIZAR_STATUS',
        antes: { status: os.status },
        depois: { status: atualizada.status },
      })
    }

    return atualizada
  }
 
  // Análise preditiva — detecta concentração de falhas por setor
  async analisePreditiva(veiculoId: string) {
    const noventa_dias = new Date()
    noventa_dias.setDate(noventa_dias.getDate() - 90)
 
    const osPorSubsistema = await this.prisma.osManutencao.groupBy({
      by:     ['subsistema'],
      where:  { veiculoId, criadoEm: { gte: noventa_dias }, subsistema: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })
 
    const alertas = osPorSubsistema
      .filter(s => s._count.id >= 5) // limiar: 5 OSs em 90 dias
      .map(s => ({
        subsistema: s.subsistema,
        quantidade: s._count.id,
        alerta:     `${s._count.id} OSs no subsistema "${s.subsistema}" nos últimos 90 dias. Considere revisão completa.`,
      }))
 
    return { veiculoId, alertas, analisadoEm: new Date() }
  }
 
  // Revisões por item
  async getRevisoes(veiculoId: string) {
    const hoje     = new Date()
    const em30dias = new Date()
    em30dias.setDate(hoje.getDate() + 30)
 
    const itens = await this.prisma.itemRevisao.findMany({
      where:   { veiculoId, ativo: true },
      orderBy: { dataProxima: 'asc' },
    })
 
    return itens.map(item => ({
      ...item,
      status: !item.dataProxima ? 'ok' :
              item.dataProxima <= hoje     ? 'vencido' :
              item.dataProxima <= em30dias ? 'proximo' : 'ok',
    }))
  }
 
  async registrarTrocaItem(itemRevisaoId: string, kmAtual: number, fornecedor?: string, valor?: number, usuarioId?: string) {
    const item = await this.prisma.itemRevisao.findUnique({
      where: { id: itemRevisaoId },
    })
    if (!item) throw new NotFoundException('Item de revisão não encontrado')
 
    // Registra no histórico
    await this.prisma.historicoRevisao.create({
      data: {
        itemRevisaoId,
        kmNaMoment:  kmAtual,
        dataTroca:   new Date(),
        fornecedor,
        valor,
      },
    })
 
    // Recalcula APENAS este item (não zera os outros — guardrail do escopo)
    const updates: any = { dataProxima: null, kmProximo: null }
    if (item.kmIntervalo)  updates.kmProximo   = kmAtual + item.kmIntervalo
    if (item.diasIntervalo) {
      const proxima = new Date()
      proxima.setDate(proxima.getDate() + item.diasIntervalo)
      updates.dataProxima = proxima
    }
 
    const atualizado = await this.prisma.itemRevisao.update({
      where: { id: itemRevisaoId },
      data:  updates,
    })

    if (usuarioId) {
      await this.auditoria.registrar({
        usuarioId,
        entidade: 'ItemRevisao',
        registroId: itemRevisaoId,
        acao: 'REGISTRAR_TROCA',
        depois: { kmAtual, fornecedor, valor, kmProximo: atualizado.kmProximo, dataProxima: atualizado.dataProxima },
      })
    }

    return atualizado
  }

  // ── Comparador de fornecedor/oficina ──────────────────────
  // Ranking por categoria (subsistema): custo médio, prazo médio e volume
  // de serviço por oficina, pra decidir onde levar o próximo serviço.
  async comparadorFornecedores(subsistema?: string) {
    const os = await this.prisma.osManutencao.findMany({
      where: {
        status: 'CONCLUIDO',
        oficina: { not: null },
        valorReal: { not: null },
        ...(subsistema && { subsistema }),
      },
      select: { oficina: true, subsistema: true, valorReal: true, criadoEm: true, concluidoEm: true },
    })

    const porOficina = new Map<
      string,
      { valores: number[]; prazosDias: number[]; subsistemas: Set<string> }
    >()
    for (const o of os) {
      const chave = o.oficina as string
      const grupo = porOficina.get(chave) ?? { valores: [], prazosDias: [], subsistemas: new Set() }
      grupo.valores.push(o.valorReal as number)
      if (o.concluidoEm) {
        const dias = (o.concluidoEm.getTime() - o.criadoEm.getTime()) / (1000 * 60 * 60 * 24)
        grupo.prazosDias.push(dias)
      }
      if (o.subsistema) grupo.subsistemas.add(o.subsistema)
      porOficina.set(chave, grupo)
    }

    const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

    const ranking = [...porOficina.entries()]
      .map(([oficina, g]) => ({
        oficina,
        valorMedio: +media(g.valores)!.toFixed(2),
        prazoMedioDias: g.prazosDias.length ? +media(g.prazosDias)!.toFixed(1) : null,
        servicos: g.valores.length,
        subsistemasAtendidos: [...g.subsistemas],
      }))
      .sort((a, b) => a.valorMedio - b.valorMedio)

    return { subsistema: subsistema ?? 'todos', ranking }
  }

  // ── Diagnóstico assistido por histórico de sintomas ───────
  // Casamento simples por palavras-chave (sem vetor/embeddings) contra OS
  // já concluídas — devolve o que resolveu problemas parecidos antes.
  async diagnosticoAssistido(descricao: string, veiculoId?: string) {
    const termos = descricao
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/\W+/)
      .filter((t) => t.length >= 4)

    if (termos.length === 0) return { termos: [], sugestoes: [] }

    const candidatas = await this.prisma.osManutencao.findMany({
      where: {
        status: 'CONCLUIDO',
        ...(veiculoId && { veiculoId }),
      },
      include: { pecas: true, veiculo: { select: { placa: true } } },
      orderBy: { concluidoEm: 'desc' },
      take: 200,
    })

    const pontuadas = candidatas
      .map((os) => {
        const texto = os.descricao
          .toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
        const pontos = termos.filter((t) => texto.includes(t)).length
        return { os, pontos }
      })
      .filter((c) => c.pontos > 0)
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 5)

    return {
      termos,
      sugestoes: pontuadas.map(({ os, pontos }) => ({
        osId: os.id,
        veiculo: os.veiculo.placa,
        descricaoOriginal: os.descricao,
        subsistema: os.subsistema,
        oficina: os.oficina,
        valorReal: os.valorReal,
        pecasUsadas: os.pecas.map((p) => p.descricao),
        similaridade: pontos,
      })),
    }
  }

  // ── Auxiliar de orçamento de peças ────────────────────────
  // Histórico de preço por peça (12-24 meses) — sem busca online de mercado
  // (sem provedor de search configurado), mas com o que já temos: preço
  // pago historicamente e por qual fornecedor/oficina.
  async orcamentoPeca(descricaoPeca: string, meses = 18) {
    const desde = new Date()
    desde.setMonth(desde.getMonth() - meses)

    const compras = await this.prisma.osManutencaoPeca.findMany({
      where: {
        descricao: { contains: descricaoPeca, mode: 'insensitive' },
        criadoEm: { gte: desde },
        valorUnitario: { not: null },
      },
      include: { os: { select: { oficina: true, veiculo: { select: { placa: true } } } } },
      orderBy: { criadoEm: 'desc' },
    })

    if (compras.length === 0) {
      return { peca: descricaoPeca, amostras: 0, historico: [] }
    }

    const valores = compras.map((c) => c.valorUnitario as number)
    const menor = Math.min(...valores)
    const maior = Math.max(...valores)
    const media = valores.reduce((a, b) => a + b, 0) / valores.length

    const porFornecedor = new Map<string, number[]>()
    for (const c of compras) {
      const forn = c.os.oficina ?? 'não informado'
      const lista = porFornecedor.get(forn) ?? []
      lista.push(c.valorUnitario as number)
      porFornecedor.set(forn, lista)
    }
    const melhorFornecedor = [...porFornecedor.entries()]
      .map(([fornecedor, vs]) => ({ fornecedor, precoMedio: +(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(2), amostras: vs.length }))
      .sort((a, b) => a.precoMedio - b.precoMedio)[0]

    return {
      peca: descricaoPeca,
      amostras: compras.length,
      precoMedio: +media.toFixed(2),
      precoMinimo: menor,
      precoMaximo: maior,
      melhorFornecedor,
      historico: compras.slice(0, 20).map((c) => ({
        data: c.criadoEm,
        valorUnitario: c.valorUnitario,
        fornecedor: c.os.oficina,
        veiculo: c.os.veiculo.placa,
      })),
    }
  }

  // ── Assistente de orçamento de peças por IA ───────────────
  // `orcamentoPeca()` acima já existia, mas só casa por substring exata —
  // se o usuário descreve a peça com um sinônimo/abreviação diferente do que
  // ficou salvo no histórico (ex: "pastilha" vs "pastilha de freio dianteira"),
  // não acha nada. Aqui a IA só faz DUAS coisas, nenhuma delas inventa preço:
  // (1) sugere variações/sinônimos de busca em cima da descrição livre, pra
  // aumentar o recall contra o histórico real; (2) narra em texto os números
  // JÁ CALCULADOS por `orcamentoPeca()` — nunca escreve um valor que não veio
  // do banco. Se a IA falhar ou não tiver chave configurada, cai pro resultado
  // puro de `orcamentoPeca()` sem recomendação em texto (nunca quebra a
  // funcionalidade principal por causa da parte de IA).
  async assistenteOrcamentoPeca(descricaoLivre: string, meses = 18) {
    const termos = await this.gerarTermosBusca(descricaoLivre)
    const termosTentados = [descricaoLivre, ...termos.filter((t) => t.toLowerCase() !== descricaoLivre.toLowerCase())]

    const vistos = new Set<string>()
    const compras: { id: string; criadoEm: Date; valorUnitario: number; oficina: string | null; placa: string }[] = []

    for (const termo of termosTentados) {
      if (!termo?.trim()) continue
      const desde = new Date()
      desde.setMonth(desde.getMonth() - meses)
      const encontradas = await this.prisma.osManutencaoPeca.findMany({
        where: { descricao: { contains: termo, mode: 'insensitive' }, criadoEm: { gte: desde }, valorUnitario: { not: null } },
        include: { os: { select: { oficina: true, veiculo: { select: { placa: true } } } } },
      })
      for (const c of encontradas) {
        if (vistos.has(c.id)) continue
        vistos.add(c.id)
        compras.push({
          id: c.id,
          criadoEm: c.criadoEm,
          valorUnitario: c.valorUnitario as number,
          oficina: c.os.oficina,
          placa: c.os.veiculo.placa,
        })
      }
    }

    if (compras.length === 0) {
      return {
        peca: descricaoLivre,
        termosBuscados: termosTentados,
        amostras: 0,
        historico: [],
        recomendacaoIA: null,
      }
    }

    compras.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
    const valores = compras.map((c) => c.valorUnitario)
    const precoMedio = +(valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2)
    const precoMinimo = Math.min(...valores)
    const precoMaximo = Math.max(...valores)

    const porFornecedor = new Map<string, number[]>()
    for (const c of compras) {
      const forn = c.oficina ?? 'não informado'
      const lista = porFornecedor.get(forn) ?? []
      lista.push(c.valorUnitario)
      porFornecedor.set(forn, lista)
    }
    const melhorFornecedor = [...porFornecedor.entries()]
      .map(([fornecedor, vs]) => ({ fornecedor, precoMedio: +(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(2), amostras: vs.length }))
      .sort((a, b) => a.precoMedio - b.precoMedio)[0]

    const resultado = {
      peca: descricaoLivre,
      termosBuscados: termosTentados,
      amostras: compras.length,
      precoMedio,
      precoMinimo,
      precoMaximo,
      melhorFornecedor,
      historico: compras.slice(0, 20).map((c) => ({ data: c.criadoEm, valorUnitario: c.valorUnitario, fornecedor: c.oficina, veiculo: c.placa })),
    }

    const recomendacaoIA = await this.narrarOrcamento(resultado)
    return { ...resultado, recomendacaoIA }
  }

  private async gerarTermosBusca(descricaoLivre: string): Promise<string[]> {
    try {
      const r = await this.llm.completar({
        json: true,
        prompt:
          `Um mecânico de frota rodoviária brasileira quer buscar o histórico de preço da peça: "${descricaoLivre}". ` +
          'Gere até 4 termos de busca curtos (2-4 palavras cada) incluindo sinônimos/abreviações comuns de oficina ' +
          '(ex: variações de plural, "jogo de", nome comercial vs técnico). Responda APENAS JSON: {"termos": string[]}',
      })
      return Array.isArray(r?.termos) ? r.termos.slice(0, 4) : []
    } catch (e) {
      this.logger.warn('Assistente de peças: falha ao gerar termos de busca via IA, seguindo só com o termo original', e)
      return []
    }
  }

  private async narrarOrcamento(dados: {
    peca: string
    amostras: number
    precoMedio: number
    precoMinimo: number
    precoMaximo: number
    melhorFornecedor: { fornecedor: string; precoMedio: number; amostras: number }
  }): Promise<string | null> {
    try {
      const texto = await this.llm.completar({
        json: false,
        prompt:
          'Aqui estão dados REAIS de histórico de compra de uma peça de frota (não invente nenhum valor além ' +
          `destes): ${JSON.stringify(dados)}. Escreva uma recomendação curta (2-3 frases, português informal de ` +
          'oficina) mencionando o preço médio e o fornecedor mais barato. Se "amostras" for menor que 3, avise que ' +
          'a confiança é baixa por causa da amostra pequena. Responda só o texto da recomendação, sem formatação.',
      })
      return typeof texto === 'string' ? texto.trim() : null
    } catch (e) {
      this.logger.warn('Assistente de peças: falha ao gerar recomendação em texto via IA', e)
      return null
    }
  }
}