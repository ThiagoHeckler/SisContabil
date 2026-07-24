/**
 * Cliente HTTP central da API Laravel.
 * Injeta o token Sanctum (Authorization: Bearer) e trata 401 (sessão expirada).
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const TOKEN_KEY = 'siscontabil_token'

export function getToken()      { return localStorage.getItem(TOKEN_KEY) }
export function setToken(token) { localStorage.setItem(TOKEN_KEY, token) }
export function clearToken()    { localStorage.removeItem(TOKEN_KEY) }

/** Disparado quando a API responde 401 — a camada de auth escuta e desloga. */
export const AUTH_EXPIRED_EVENT = 'siscontabil:auth-expired'

export async function apiFetch(path, options = {}) {
  const token   = getToken()
  const headers = {
    'Accept': 'application/json',
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    clearToken()
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? 'Sessão expirada. Faça login novamente.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // Erros de validação do Laravel vêm em body.errors
    const first = body.errors ? Object.values(body.errors)[0]?.[0] : null
    throw new Error(first ?? body.message ?? `HTTP ${res.status}`)
  }

  // 204 No Content
  if (res.status === 204) return null
  return res.json()
}
