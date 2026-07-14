// Gera CSV compatível com Excel PT-BR (separador ; , BOM UTF-8) sem depender de lib externa.
export function paraCsv(colunas: string[], linhas: (string | number | null | undefined)[][]): string {
  const escapar = (valor: string | number | null | undefined): string => {
    const texto = valor === null || valor === undefined ? '' : String(valor)
    if (texto.includes(';') || texto.includes('"') || texto.includes('\n')) {
      return `"${texto.replace(/"/g, '""')}"`
    }
    return texto
  }
  const linhasTexto = [colunas, ...linhas].map((linha) => linha.map(escapar).join(';'))
  return '﻿' + linhasTexto.join('\r\n')
}
