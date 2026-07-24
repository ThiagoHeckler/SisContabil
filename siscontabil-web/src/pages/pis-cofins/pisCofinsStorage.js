/**
 * Cadastro de regras de enquadramento PIS/COFINS (alíquota zero) por NCM.
 * Agora persistido no MySQL via API Laravel (/api/pis-cofins-regras),
 * protegido por auth:sanctum.
 */

import { apiFetch } from '../../lib/api'

/** Normaliza para NCM de 8 dígitos (formato oficial): remove não-dígitos e completa zeros à esquerda. */
export function normalizeNcm8(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.padStart(8, '0').slice(0, 8)
}

export async function getAllRegras() {
  return apiFetch('/pis-cofins-regras')
}

export async function insertRegra(entry) {
  return apiFetch('/pis-cofins-regras', {
    method: 'POST',
    body: JSON.stringify({ ...entry, ncm: normalizeNcm8(entry.ncm) }),
  })
}

export async function updateRegra(id, patch) {
  return apiFetch(`/pis-cofins-regras/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...patch, ncm: normalizeNcm8(patch.ncm) }),
  })
}

export async function deleteRegra(id) {
  return apiFetch(`/pis-cofins-regras/${id}`, { method: 'DELETE' })
}

export async function searchRegras(term) {
  const t = (term || '').trim()
  const qs = t ? `?busca=${encodeURIComponent(t)}` : ''
  return apiFetch(`/pis-cofins-regras${qs}`)
}

/** Mapa ncm(8 dígitos) → regra, para lookup O(1) durante o processamento da tabela. */
export async function buildRegrasMap() {
  const regras = await getAllRegras()
  const map = new Map()
  regras.forEach(r => map.set(r.ncm, r))
  return map
}

// ── Migração dos dados locais (localStorage → API) ──────────────────

const LEGACY_KEY = 'siscontabil_pis_cofins_regras'

export function getLegacyRegras() {
  try { return JSON.parse(localStorage.getItem(LEGACY_KEY)) || [] }
  catch { return [] }
}

export async function importLegacyRegras() {
  const itens = getLegacyRegras()
  if (!itens.length) return { importados: 0 }
  const res = await apiFetch('/pis-cofins-regras/importar', {
    method: 'POST',
    body: JSON.stringify({ itens }),
  })
  localStorage.removeItem(LEGACY_KEY)
  return res
}
