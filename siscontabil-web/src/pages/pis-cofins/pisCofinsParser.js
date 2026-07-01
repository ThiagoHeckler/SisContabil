/**
 * Leitura da planilha de entrada (Código, NCM, Descrição) e cruzamento com o
 * cadastro de regras PIS/COFINS para gerar a tabela de saída com o
 * enquadramento de alíquota zero.
 */

import * as XLSX from 'xlsx'
import { downloadXls } from '../../lib/spreadsheet'

const HEADERS_PADRAO = ['Código', 'NCM', 'Descrição']

/**
 * O NCM da tabela de entrada tem 11 dígitos (formato do sistema externo).
 * Se o Excel guardou a coluna como número, zeros à esquerda podem ter sido
 * perdidos — por isso completamos para 11 dígitos antes de truncar para os
 * 8 dígitos do NCM oficial usados no cadastro/comparação.
 */
export function extrairNcm8DaTabela(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.padStart(11, '0').slice(0, 8)
}

/**
 * Lê o .xlsx enviado pelo usuário. Primeira linha = cabeçalho (ignorada para
 * os dados, mas usada como rótulo das colunas na exportação); dados a partir
 * da segunda linha, nas 3 primeiras colunas: Código, NCM, Descrição.
 */
export async function lerTabelaXlsx(file) {
  const buffer   = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet    = workbook.Sheets[workbook.SheetNames[0]]
  const matrix   = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false })

  if (matrix.length < 2) {
    throw new Error('A planilha está vazia ou não tem linhas de dados (a primeira linha deve ser o cabeçalho: Código, NCM, Descrição).')
  }

  const [headerRow, ...dataRows] = matrix
  const headers = HEADERS_PADRAO.map((padrao, i) => {
    const v = headerRow[i]
    return v != null && String(v).trim() !== '' ? String(v).trim() : padrao
  })

  const rows = dataRows
    .filter(r => r.some(c => String(c ?? '').trim() !== ''))
    .map(r => ({
      codigo:    String(r[0] ?? '').trim(),
      ncm:       String(r[1] ?? '').trim(),
      descricao: String(r[2] ?? '').trim(),
    }))

  if (rows.length === 0) {
    throw new Error('Nenhuma linha de dados encontrada a partir da segunda linha da planilha.')
  }

  return { headers, rows }
}

/** Cruza cada linha da tabela com o cadastro de regras (Map ncm8 → regra). */
export function processarTabela(rows, regrasMap) {
  const processadas = rows.map(row => {
    const ncm8  = extrairNcm8DaTabela(row.ncm)
    const regra = regrasMap.get(ncm8)
    return {
      ...row,
      ncm8,
      enquadrado:          !!regra,
      codigoEnquadramento: regra?.codigoEnquadramento ?? '',
      tabela:              regra?.tabela ?? '',
      lei:                 regra?.lei ?? '',
    }
  })

  const enquadrados = processadas.filter(r => r.enquadrado).length

  return {
    rows: processadas,
    stats: {
      total:          processadas.length,
      enquadrados,
      naoEnquadrados: processadas.length - enquadrados,
    },
  }
}

export function exportarResultado(headers, rows, nomeArquivo) {
  const cabecalho = [...headers, 'Cód. Enquadramento', 'Tabela', 'Lei (Base Legal)']
  const linhas = rows.map(r => [
    r.codigo, r.ncm, r.descricao,
    r.codigoEnquadramento, r.tabela, r.lei,
  ])
  downloadXls(cabecalho, linhas, nomeArquivo, 'PIS-COFINS')
}
