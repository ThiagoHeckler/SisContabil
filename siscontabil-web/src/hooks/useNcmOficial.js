import { useState, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Accept': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

/** Busca NCMs na API Laravel com debounce interno. */
export function useNcmBusca() {
  const [resultados,  setResultados]  = useState([])
  const [paginacao,   setPaginacao]   = useState(null)
  const [carregando,  setCarregando]  = useState(false)
  const [erro,        setErro]        = useState(null)
  const timer = useRef(null)

  const buscar = useCallback((termo, pagina = 1) => {
    clearTimeout(timer.current)
    const t = (termo ?? '').trim()

    if (t.length < 2) {
      setResultados([])
      setPaginacao(null)
      return
    }

    timer.current = setTimeout(async () => {
      setCarregando(true)
      setErro(null)
      try {
        const data = await apiFetch(`/ncm?busca=${encodeURIComponent(t)}&page=${pagina}`)
        setResultados(data.data ?? [])
        setPaginacao({
          atual:  data.meta?.current_page ?? 1,
          ultima: data.meta?.last_page ?? 1,
          total:  data.meta?.total ?? 0,
        })
      } catch (e) {
        setErro(e.message)
      } finally {
        setCarregando(false)
      }
    }, 400)
  }, [])

  const limpar = useCallback(() => {
    clearTimeout(timer.current)
    setResultados([])
    setPaginacao(null)
    setErro(null)
  }, [])

  return { resultados, paginacao, carregando, erro, buscar, limpar }
}

/** Status e sincronização. */
export function useNcmSincronizacao() {
  const [status,       setStatus]       = useState(null)   // { total, vigencia, sincronizado }
  const [sincronizando,setSincronizando] = useState(false)
  const [resultado,    setResultado]     = useState(null)
  const [erro,         setErro]          = useState(null)

  const carregarStatus = useCallback(async () => {
    try {
      const data = await apiFetch('/ncm/status')
      setStatus(data)
    } catch {
      setStatus(null)
    }
  }, [])

  const sincronizar = useCallback(async () => {
    setSincronizando(true)
    setErro(null)
    setResultado(null)
    try {
      const data = await apiFetch('/ncm/sincronizar', { method: 'POST' })
      setResultado(data)
      setStatus({
        total:        data.total,
        vigencia:     data.vigencia,
        sincronizado: true,
      })
    } catch (e) {
      setErro(e.message)
    } finally {
      setSincronizando(false)
    }
  }, [])

  return { status, sincronizando, resultado, erro, carregarStatus, sincronizar }
}
