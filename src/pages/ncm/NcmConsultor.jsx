import { useState, useRef } from 'react'
import { Search, Loader2, AlertCircle, BookOpen } from 'lucide-react'
import './NcmConsultor.css'

const API = 'https://brasilapi.com.br/api/ncm/v1'

function useDebounce(fn, delay) {
  const timer = useRef(null)
  return (...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }
}

export default function NcmConsultor() {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [searched, setSearched] = useState(false)

  async function buscar(q) {
    const term = q.trim()
    if (!term) { setResults([]); setSearched(false); return }

    setLoading(true)
    setError('')
    setSelected(null)

    try {
      const isCode = /^\d+$/.test(term.replace(/\./g, ''))
      let url

      if (isCode && term.replace(/\D/g, '').length === 8) {
        // busca exata por código
        url = `${API}/${term.replace(/\D/g, '')}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('NCM não encontrado.')
        const data = await res.json()
        setResults([data])
      } else {
        // busca por descrição ou código parcial
        url = `${API}?search=${encodeURIComponent(term)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Erro ao consultar a API NCM.')
        const data = await res.json()
        setResults(Array.isArray(data) ? data.slice(0, 50) : [])
      }
      setSearched(true)
    } catch (err) {
      setError(err.message || 'Erro de conexão.')
      setResults([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const debouncedBuscar = useDebounce(buscar, 500)

  function onChange(e) {
    const v = e.target.value
    setQuery(v)
    debouncedBuscar(v)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') { clearTimeout; buscar(query) }
  }

  return (
    <div>
      <div className="page-header">
        <h1><Search size={22} /> Consultor NCM</h1>
        <p>Pesquise códigos NCM por número (8 dígitos) ou por descrição do produto.</p>
      </div>

      {/* Barra de busca */}
      <div className="card ncm-search-card">
        <div className="ncm-search-bar">
          {loading
            ? <Loader2 size={18} className="ncm-search-icon spin" />
            : <Search size={18} className="ncm-search-icon" />
          }
          <input
            type="search"
            placeholder="Digite o código NCM ou descrição... (ex: 8471.30, notebook)"
            value={query}
            onChange={onChange}
            onKeyDown={onKeyDown}
            className="ncm-search-input"
            autoFocus
          />
        </div>
        <p className="ncm-search-hint">
          Pesquisa automática após digitar · <kbd>Enter</kbd> para busca imediata ·
          Fonte: <a href="https://brasilapi.com.br" target="_blank" rel="noreferrer">BrasilAPI</a>
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* Detalhe do item selecionado */}
      {selected && (
        <div className="card ncm-detail">
          <div className="card-title"><BookOpen size={16} /> Detalhes do NCM</div>
          <div className="ncm-detail-grid">
            <div className="ncm-detail-item">
              <span className="ncm-detail-label">Código NCM</span>
              <span className="ncm-detail-value ncm-code">{fmtNcm(selected.codigo)}</span>
            </div>
            <div className="ncm-detail-item">
              <span className="ncm-detail-label">Descrição</span>
              <span className="ncm-detail-value">{selected.descricao}</span>
            </div>
            {selected.data_inicio && (
              <div className="ncm-detail-item">
                <span className="ncm-detail-label">Vigência</span>
                <span className="ncm-detail-value">
                  {fmtDt(selected.data_inicio)}
                  {selected.data_fim ? ` até ${fmtDt(selected.data_fim)}` : ' (em vigor)'}
                </span>
              </div>
            )}
            {selected.tipo_ato && (
              <div className="ncm-detail-item">
                <span className="ncm-detail-label">Ato legal</span>
                <span className="ncm-detail-value">
                  {selected.tipo_ato} {selected.numero_ato}/{selected.ano_ato}
                </span>
              </div>
            )}
          </div>
          <div className="alert alert-info" style={{ marginTop: '1rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Para alíquotas de II, IPI e outros tributos consulte a TIPI vigente
              (Decreto 11.158/2022) e a tabela ICMS do seu estado.
            </span>
          </div>
        </div>
      )}

      {/* Lista de resultados */}
      {results.length > 0 && (
        <div className="card ncm-results">
          <div className="card-title">
            {results.length} resultado(s){results.length === 50 ? ' (exibindo os primeiros 50)' : ''}
          </div>
          <div className="ncm-list">
            {results.map(item => (
              <button
                key={item.codigo}
                className={`ncm-item ${selected?.codigo === item.codigo ? 'ncm-item--active' : ''}`}
                onClick={() => setSelected(s => s?.codigo === item.codigo ? null : item)}
              >
                <span className="ncm-item__code">{fmtNcm(item.codigo)}</span>
                <span className="ncm-item__desc">{item.descricao}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <div className="alert alert-warn">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          Nenhum NCM encontrado para <strong>"{query}"</strong>.
          Tente um código diferente ou outra descrição.
        </div>
      )}
    </div>
  )
}

function fmtNcm(code) {
  if (!code) return ''
  const s = String(code).padStart(8, '0')
  return `${s.slice(0,4)}.${s.slice(4,6)}.${s.slice(6)}`
}

function fmtDt(s) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('pt-BR')
}
