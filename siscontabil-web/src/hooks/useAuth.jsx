import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { apiFetch, setToken, clearToken, getToken, AUTH_EXPIRED_EVENT } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,       setUser]       = useState(null)
  const [carregando, setCarregando] = useState(true)   // true enquanto valida token inicial

  // Valida o token guardado ao carregar o app.
  useEffect(() => {
    let ativo = true
    async function validar() {
      if (!getToken()) { setCarregando(false); return }
      try {
        const dados = await apiFetch('/auth/me')
        if (ativo) setUser(dados)
      } catch {
        if (ativo) { clearToken(); setUser(null) }
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    validar()
    return () => { ativo = false }
  }, [])

  // Reage a 401 vindo de qualquer chamada da API.
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  const login = useCallback(async (email, password) => {
    const dados = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(dados.token)
    setUser(dados.user)
    return dados.user
  }, [])

  const logout = useCallback(async () => {
    try { await apiFetch('/auth/logout', { method: 'POST' }) }
    catch { /* token pode já estar inválido — segue deslogando localmente */ }
    clearToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
