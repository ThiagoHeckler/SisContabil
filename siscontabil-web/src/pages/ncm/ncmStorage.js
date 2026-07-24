/**
 * Registro fiscal de NCM (MVA/antecipação por estado) — agora persistido no
 * MySQL via API Laravel (/api/ncm-fiscal), protegido por auth:sanctum.
 *
 * O histórico do cálculo ST continua em localStorage (calculadora local,
 * não compartilhada — ver CLAUDE.md).
 */

import { apiFetch } from '../../lib/api'

// ── NCM fiscal (API) ─────────────────────────────────────────────────

export async function getAllNcm() {
  return apiFetch('/ncm-fiscal')
}

export async function insertNcm(entry) {
  return apiFetch('/ncm-fiscal', {
    method: 'POST',
    body: JSON.stringify(entry),
  })
}

export async function updateNcm(id, patch) {
  return apiFetch(`/ncm-fiscal/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

export async function deleteNcm(id) {
  return apiFetch(`/ncm-fiscal/${id}`, { method: 'DELETE' })
}

export async function searchNcm(term) {
  const t = (term || '').trim()
  const qs = t ? `?busca=${encodeURIComponent(t)}` : ''
  return apiFetch(`/ncm-fiscal${qs}`)
}

// ── Migração dos dados locais (localStorage → API) ──────────────────

const LEGACY_KEY = 'siscontabil_ncm_database'

/** Lê o registro antigo do localStorage (array) sem removê-lo. */
export function getLegacyNcm() {
  try { return JSON.parse(localStorage.getItem(LEGACY_KEY)) || [] }
  catch { return [] }
}

/** Envia os dados legados para a API em lote e limpa o localStorage. */
export async function importLegacyNcm() {
  const itens = getLegacyNcm()
  if (!itens.length) return { importados: 0 }
  const res = await apiFetch('/ncm-fiscal/importar', {
    method: 'POST',
    body: JSON.stringify({ itens }),
  })
  localStorage.removeItem(LEGACY_KEY)
  return res
}

// ── ST Histórico (permanece em localStorage) ────────────────────────

const KEY_HIST = 'siscontabil_st_historico'

function loadHist()      { try { return JSON.parse(localStorage.getItem(KEY_HIST)) || [] } catch { return [] } }
function saveHist(data)   { localStorage.setItem(KEY_HIST, JSON.stringify(data)) }
function nextId(arr)      { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }

export function getAllHistorico()   { return loadHist().reverse() }

export function insertHistorico(h) {
  const list = loadHist()
  const item = { ...h, id: nextId(list) }
  saveHist([...list, item])
  return item
}

export function deleteHistorico(id) {
  saveHist(loadHist().filter(x => x.id !== id))
}

export function clearHistorico() {
  saveHist([])
}
