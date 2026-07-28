import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const KEY = 'siscontabil_theme'
const ThemeContext = createContext(null)

/** Tema inicial: preferência salva ou o esquema do sistema. */
function temaInicial() {
  try {
    const salvo = localStorage.getItem(KEY)
    if (salvo === 'light' || salvo === 'dark') return salvo
  } catch { /* ignore */ }
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

// Aplica imediatamente (antes do primeiro render) para evitar "flash".
const INICIAL = temaInicial()
document.documentElement.setAttribute('data-theme', INICIAL)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(INICIAL)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>')
  return ctx
}
