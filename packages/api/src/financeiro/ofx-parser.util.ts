// Parser de extrato OFX (Open Financial Exchange) — formato baixado do
// internet banking pra conciliação. Doc de integrações §7: "viável já,
// baixo custo". OFX é SGML-like (tags sem fechamento obrigatório), não
// precisa de biblioteca externa — as tags que importam pra conciliação
// (<STMTTRN>...</STMTTRN>) sempre vêm bem formadas na prática.

export interface TransacaoOfx {
  fitId: string
  tipo: string // CREDIT | DEBIT | ...
  data: Date
  valor: number
  descricao: string
}

function extrairTag(bloco: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i')
  const m = bloco.match(regex)
  return m ? m[1].trim() : null
}

// Datas OFX vêm como YYYYMMDDHHMMSS[.xxx][:GMT] — só os 8 primeiros dígitos importam aqui.
function parseDataOfx(bruto: string): Date {
  const ano = +bruto.slice(0, 4)
  const mes = +bruto.slice(4, 6) - 1
  const dia = +bruto.slice(6, 8)
  return new Date(ano, mes, dia)
}

export function parseOfx(conteudo: string): TransacaoOfx[] {
  const blocos = conteudo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? []

  return blocos
    .map((bloco): TransacaoOfx | null => {
      const fitId = extrairTag(bloco, 'FITID')
      const tipo = extrairTag(bloco, 'TRNTYPE') ?? ''
      const dataBruta = extrairTag(bloco, 'DTPOSTED')
      const valorBruto = extrairTag(bloco, 'TRNAMT')
      const memo = extrairTag(bloco, 'MEMO') ?? extrairTag(bloco, 'NAME') ?? ''

      if (!fitId || !dataBruta || !valorBruto) return null

      return {
        fitId,
        tipo,
        data: parseDataOfx(dataBruta),
        valor: parseFloat(valorBruto),
        descricao: memo,
      }
    })
    .filter((t): t is TransacaoOfx => t !== null)
}
