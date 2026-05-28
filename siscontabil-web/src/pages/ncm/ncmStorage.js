/**
 * Persistência em localStorage — substitui o SQLite do app Java original.
 */

const KEY_NCM  = 'siscontabil_ncm_database'
const KEY_HIST = 'siscontabil_st_historico'

function load(key)         { try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] } }
function save(key, data)   { localStorage.setItem(key, JSON.stringify(data)) }
function nextId(arr)       { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }

// ── NCM entries ──────────────────────────────────────────────────

export function getAllNcm()         { return load(KEY_NCM) }

export function insertNcm(entry) {
  const list = getAllNcm()
  const item = { ...entry, id: nextId(list) }
  save(KEY_NCM, [...list, item])
  return item
}

export function updateNcm(id, patch) {
  const list = getAllNcm().map(x => x.id === id ? { ...x, ...patch } : x)
  save(KEY_NCM, list)
}

export function deleteNcm(id) {
  save(KEY_NCM, getAllNcm().filter(x => x.id !== id))
}

export function searchNcm(term) {
  const t = (term || '').trim().toLowerCase()
  if (!t) return getAllNcm()
  return getAllNcm().filter(x =>
    x.ncm.toLowerCase().includes(t) ||
    x.nomeProduto.toLowerCase().includes(t)
  )
}

// ── ST Histórico ─────────────────────────────────────────────────

export function getAllHistorico()   { return load(KEY_HIST).reverse() }

export function insertHistorico(h) {
  const list = load(KEY_HIST)
  const item = { ...h, id: nextId(list) }
  save(KEY_HIST, [...list, item])
  return item
}

export function deleteHistorico(id) {
  save(KEY_HIST, load(KEY_HIST).filter(x => x.id !== id))
}

export function clearHistorico() {
  save(KEY_HIST, [])
}
