/**
 * Conferência de XMLs de NF-e contra uma lista de chaves de acesso (44 dígitos).
 * A chave é extraída de DENTRO do XML (infNFe Id="NFe..." ou <chNFe>),
 * não do nome do arquivo.
 */

/** Extrai a chave de 44 dígitos do conteúdo do XML. Retorna null se não achar. */
export function extractChave(xmlText) {
  const texto = String(xmlText ?? '')

  // 1) atributo Id do infNFe: Id="NFe<44 dígitos>"
  let m = texto.match(/Id\s*=\s*["']\s*NFe\s*(\d{44})\s*["']/i)
  if (m) return m[1]

  // 2) elemento <chNFe>44 dígitos</chNFe> (presente no protNFe)
  m = texto.match(/<chNFe>\s*(\d{44})\s*<\/chNFe>/i)
  if (m) return m[1]

  // 3) fallback: qualquer sequência isolada de 44 dígitos
  m = texto.match(/(?<!\d)(\d{44})(?!\d)/)
  if (m) return m[1]

  return null
}

/** Converte um texto livre de chaves em tokens só-dígitos (uma por linha, vírgula, etc). */
export function parseChavesList(text) {
  return String(text ?? '')
    .split(/[\s,;]+/)
    .map(t => t.replace(/\D/g, ''))
    .filter(Boolean)
}

/**
 * Confere os arquivos contra as chaves informadas.
 * @param {{name: string, chave: string|null}[]} arquivos
 * @param {string} chavesText
 */
export function conferir(arquivos, chavesText) {
  const todas    = parseChavesList(chavesText)
  const invalidas = [...new Set(todas.filter(k => k.length !== 44))]
  const pedidas   = new Set(todas.filter(k => k.length === 44))

  const conferidos     = []  // arquivo cuja chave está na lista pedida
  const naoSolicitados = []  // arquivo com chave válida, mas fora da lista
  const semChave       = []  // arquivo sem chave legível
  const usadas         = new Set()

  for (const a of arquivos) {
    if (!a.chave) { semChave.push(a); continue }
    if (pedidas.has(a.chave)) { conferidos.push(a); usadas.add(a.chave) }
    else naoSolicitados.push(a)
  }

  const naoEncontradas = [...pedidas].filter(k => !usadas.has(k))

  return {
    conferidos,
    naoSolicitados,
    semChave,
    naoEncontradas,   // chaves pedidas sem XML correspondente
    invalidas,        // chaves informadas que não têm 44 dígitos
    totalPedidas: pedidas.size,
  }
}
