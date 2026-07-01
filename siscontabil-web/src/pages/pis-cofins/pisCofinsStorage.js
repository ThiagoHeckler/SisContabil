/**
 * Cadastro de regras de enquadramento PIS/COFINS (alíquota zero) por NCM.
 * Persistência em localStorage, independente do cadastro de NCM/ICMS do Consultor NCM.
 */

const KEY = 'siscontabil_pis_cofins_regras'

function load()       { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }
function save(data)   { localStorage.setItem(KEY, JSON.stringify(data)) }
function nextId(arr)  { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }

/** Normaliza para NCM de 8 dígitos (formato oficial): remove não-dígitos e completa zeros à esquerda. */
export function normalizeNcm8(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.padStart(8, '0').slice(0, 8)
}

export function getAllRegras()      { return load() }

export function insertRegra(entry) {
  const list = getAllRegras()
  const item = { ...entry, ncm: normalizeNcm8(entry.ncm), id: nextId(list) }
  save([...list, item])
  return item
}

export function updateRegra(id, patch) {
  const list = getAllRegras().map(x => x.id === id
    ? { ...x, ...patch, ncm: normalizeNcm8(patch.ncm ?? x.ncm) }
    : x)
  save(list)
}

export function deleteRegra(id) {
  save(getAllRegras().filter(x => x.id !== id))
}

export function searchRegras(term) {
  const t = (term || '').trim().toLowerCase()
  if (!t) return getAllRegras()
  return getAllRegras().filter(x =>
    x.ncm.toLowerCase().includes(t) ||
    (x.descricaoProduto || '').toLowerCase().includes(t) ||
    (x.codigoEnquadramento || '').toLowerCase().includes(t) ||
    (x.tabela || '').toLowerCase().includes(t)
  )
}

/** Mapa ncm(8 dígitos) → regra, para lookup O(1) durante o processamento da tabela. */
export function buildRegrasMap() {
  const map = new Map()
  getAllRegras().forEach(r => map.set(r.ncm, r))
  return map
}
