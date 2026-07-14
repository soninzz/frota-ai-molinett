// Decodificador da chave de acesso de 44 dígitos da NFC-e/NFe.
// Padrão nacional (SEFAZ/ENCAT) — não muda por estado, funciona sem
// credencial nenhuma: cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9)
// tpEmis(1) cNF(8) cDV(1) = 44 dígitos.
//
// O QR Code impresso no cupom normalmente é uma URL tipo:
//   https://sat.sef.sc.gov.br/nfce/qrcode?p=CHAVE|2|1|1|HASH
// mas a chave em si já basta pra extrair CNPJ do posto e data de emissão
// — o valor/itens da nota exigiriam consultar o webservice oficial
// (NFeDistribuicaoDFe, precisa certificado e-CNPJ) ou o portal público
// (bloqueado por captcha/anti-bot em SC — testado e confirmado).

const UF_POR_CODIGO: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
}

const MODELO_DOCUMENTO: Record<string, string> = {
  '55': 'NF-e (produto)',
  '65': 'NFC-e (consumidor)',
}

export interface ChaveDecodificada {
  chave: string
  uf: string | null
  anoEmissao: number
  mesEmissao: number
  cnpjEmitente: string
  modelo: string
  serie: number
  numeroNota: number
  tipoEmissao: string
  valida: boolean
}

// Aceita tanto a URL completa do QR Code quanto a chave nua de 44 dígitos.
export function extrairChaveDoQrCode(input: string): string | null {
  const soDigitos = input.replace(/\D/g, '')
  // A chave está sempre em um bloco contíguo de 44 dígitos dentro da URL/string.
  const match = input.match(/\d{44}/)
  if (match) return match[0]
  if (soDigitos.length === 44) return soDigitos
  return null
}

export function decodificarChaveNFCe(input: string): ChaveDecodificada | null {
  const chave = extrairChaveDoQrCode(input)
  if (!chave) return null

  const cUF = chave.slice(0, 2)
  const aamm = chave.slice(2, 6)
  const cnpj = chave.slice(6, 20)
  const mod = chave.slice(20, 22)
  const serie = chave.slice(22, 25)
  const numero = chave.slice(25, 34)
  const tpEmis = chave.slice(34, 35)

  const valida = validarDV(chave)

  return {
    chave,
    uf: UF_POR_CODIGO[cUF] ?? null,
    anoEmissao: 2000 + parseInt(aamm.slice(0, 2), 10),
    mesEmissao: parseInt(aamm.slice(2, 4), 10),
    cnpjEmitente: cnpj,
    modelo: MODELO_DOCUMENTO[mod] ?? `desconhecido (${mod})`,
    serie: parseInt(serie, 10),
    numeroNota: parseInt(numero, 10),
    tipoEmissao: tpEmis,
    valida,
  }
}

// Dígito verificador módulo 11, conforme manual técnico da NF-e (SEFAZ).
function validarDV(chave44: string): boolean {
  if (chave44.length !== 44) return false
  const corpo = chave44.slice(0, 43)
  const dvInformado = parseInt(chave44[43], 10)

  let soma = 0
  let peso = 2
  for (let i = corpo.length - 1; i >= 0; i--) {
    soma += parseInt(corpo[i], 10) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  const dvCalculado = resto < 2 ? 0 : 11 - resto
  return dvCalculado === dvInformado
}
