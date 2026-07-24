import { useState, useCallback, useMemo } from 'react'
import {
  FileCheck2, Upload, Download, RotateCcw, CheckCircle, AlertCircle,
  KeyRound, FileX2, FileWarning, ChevronDown, ChevronUp,
} from 'lucide-react'
import { extractChave, conferir } from './spedMatcher'
import { createZip } from '../../lib/zip'
import './SpedImport.css'

export default function SpedImport() {
  const [arquivos,  setArquivos]  = useState([])   // [{ name, bytes, chave }]
  const [chaves,    setChaves]    = useState('')
  const [dragging,  setDragging]  = useState(false)
  const [lendo,     setLendo]     = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro,      setErro]      = useState('')

  // ── Leitura dos XMLs ──────────────────────────────────────────────
  const lerArquivos = useCallback(async (fileList) => {
    const xmls = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.xml'))
    if (!xmls.length) {
      setErro('Nenhum arquivo .xml selecionado.')
      return
    }
    setErro('')
    setLendo(true)
    setResultado(null)
    try {
      const lidos = await Promise.all(xmls.map(async f => {
        const bytes = new Uint8Array(await f.arrayBuffer())
        const texto = new TextDecoder('utf-8').decode(bytes)
        return { name: f.name, bytes, chave: extractChave(texto) }
      }))
      // Acrescenta aos já carregados, evitando duplicar pelo nome.
      setArquivos(prev => {
        const map = new Map(prev.map(a => [a.name, a]))
        lidos.forEach(a => map.set(a.name, a))
        return [...map.values()]
      })
    } catch {
      setErro('Erro ao ler os arquivos XML.')
    } finally {
      setLendo(false)
    }
  }, [])

  const onDrop = useCallback(async e => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) await lerArquivos(e.dataTransfer.files)
  }, [lerArquivos])

  async function onXmlInput(e) {
    if (e.target.files?.length) await lerArquivos(e.target.files)
    e.target.value = ''
  }

  async function onTxtChaves(e) {
    const file = e.target.files[0]
    if (file) {
      const texto = await file.text()
      setChaves(prev => (prev.trim() ? prev + '\n' : '') + texto)
    }
    e.target.value = ''
  }

  function limparTudo() {
    setArquivos([])
    setChaves('')
    setResultado(null)
    setErro('')
  }

  function removerArquivos() {
    setArquivos([])
    setResultado(null)
  }

  function conferirAgora() {
    setErro('')
    if (!arquivos.length) { setErro('Carregue os arquivos XML primeiro.'); return }
    if (!chaves.trim())   { setErro('Informe as chaves de acesso.'); return }
    setResultado(conferir(arquivos, chaves))
  }

  function baixarZip() {
    if (!resultado?.conferidos.length) return
    const zip = createZip(resultado.conferidos.map(a => ({ name: a.name, bytes: a.bytes })))
    const url = URL.createObjectURL(zip)
    const a   = document.createElement('a')
    const hoje = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `xmls-conferidos-${hoje}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  const semChaveCount = useMemo(
    () => arquivos.filter(a => !a.chave).length,
    [arquivos],
  )

  return (
    <div>
      <div className="page-header">
        <h1><FileCheck2 size={22} /> Importação SPED</h1>
        <p>
          Carregue os XMLs de NF-e e informe as chaves de acesso. O sistema confere
          quais XMLs correspondem às chaves (pela chave de 44 dígitos dentro do arquivo)
          e gera um ZIP com os que bateram.
        </p>
      </div>

      <div className="sped-grid">
        {/* Entrada 1 — XMLs */}
        <div className="card">
          <div className="card-title">
            <Upload size={16} /> 1. Arquivos XML
            {arquivos.length > 0 && (
              <span className="badge badge-green" style={{ marginLeft: 'auto' }}>
                {arquivos.length} carregado(s)
              </span>
            )}
          </div>

          <div
            className={`sped-dropzone ${dragging ? 'sped-dropzone--active' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {lendo ? (
              <div className="sped-loading"><span className="sped-spin" /><p>Lendo XMLs…</p></div>
            ) : (
              <>
                <Upload size={30} className="sped-dropzone__icon" />
                <p className="sped-dropzone__title">Arraste os XMLs aqui</p>
                <p className="sped-dropzone__sub">ou</p>
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  Selecionar arquivos
                  <input type="file" accept=".xml" multiple hidden onChange={onXmlInput} />
                </label>
                <p className="sped-dropzone__hint">Vários arquivos de uma vez são aceitos</p>
              </>
            )}
          </div>

          {arquivos.length > 0 && (
            <div className="sped-file-summary">
              <span>{arquivos.length} XML(s)</span>
              {semChaveCount > 0 && (
                <span className="sped-warn-inline">
                  <FileWarning size={13} /> {semChaveCount} sem chave legível
                </span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={removerArquivos}>
                <RotateCcw size={13} /> Limpar XMLs
              </button>
            </div>
          )}
        </div>

        {/* Entrada 2 — Chaves */}
        <div className="card">
          <div className="card-title"><KeyRound size={16} /> 2. Chaves de acesso</div>
          <div className="field">
            <textarea
              className="sped-chaves"
              placeholder="Cole aqui as chaves de 44 dígitos, uma por linha…"
              value={chaves}
              onChange={e => setChaves(e.target.value)}
              rows={9}
            />
            <span className="hint">Uma chave por linha (ou separadas por espaço/vírgula).</span>
          </div>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={13} /> Carregar .txt
            <input type="file" accept=".txt,.csv" hidden onChange={onTxtChaves} />
          </label>
        </div>
      </div>

      {erro && (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {erro}
        </div>
      )}

      <div className="sped-actions">
        <button className="btn btn-primary" onClick={conferirAgora}>
          <FileCheck2 size={16} /> Conferir
        </button>
        <button className="btn btn-ghost" onClick={limparTudo}>
          <RotateCcw size={16} /> Limpar tudo
        </button>
      </div>

      {resultado && <Resultado resultado={resultado} onBaixar={baixarZip} />}
    </div>
  )
}

// ── Card recolhível (só visual) ──────────────────────────────────────
function CollapsibleCard({ icon: Icon, title, children, defaultOpen = true }) {
  const [aberto, setAberto] = useState(defaultOpen)
  return (
    <div className="card">
      <div className="card-title sped-collapse-header">
        <span className="sped-collapse-title"><Icon size={16} /> {title}</span>
        <button
          className="sped-collapse-btn"
          onClick={() => setAberto(o => !o)}
          aria-expanded={aberto}
          title={aberto ? 'Recolher' : 'Expandir'}
        >
          {aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
      {aberto && children}
    </div>
  )
}

// ── Resultado da conferência ─────────────────────────────────────────
function Resultado({ resultado, onBaixar }) {
  const { conferidos, duplicados, naoSolicitados, semChave, naoEncontradas, invalidas, totalPedidas } = resultado

  return (
    <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Barra de ação */}
      <div className="card sped-resultbar">
        <div>
          <strong>{conferidos.length}</strong> de <strong>{totalPedidas}</strong> chave(s) conferida(s)
        </div>
        <button className="btn btn-primary btn-sm" onClick={onBaixar} disabled={!conferidos.length}>
          <Download size={14} /> Baixar ZIP dos conferidos
        </button>
      </div>

      {/* Stats */}
      <div className="sped-stats">
        <div className="sped-stat sped-stat--ok">
          <span className="sped-stat__val">{conferidos.length}</span>
          <span className="sped-stat__lbl">Conferidos</span>
        </div>
        <div className="sped-stat sped-stat--miss">
          <span className="sped-stat__val">{naoEncontradas.length}</span>
          <span className="sped-stat__lbl">Chaves sem XML</span>
        </div>
        <div className="sped-stat sped-stat--extra">
          <span className="sped-stat__val">{naoSolicitados.length}</span>
          <span className="sped-stat__lbl">XMLs não pedidos</span>
        </div>
        <div className="sped-stat sped-stat--nokey">
          <span className="sped-stat__val">{semChave.length}</span>
          <span className="sped-stat__lbl">XMLs sem chave</span>
        </div>
      </div>

      {invalidas.length > 0 && (
        <div className="alert alert-warn">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          {invalidas.length} chave(s) informada(s) não têm 44 dígitos e foram ignoradas.
        </div>
      )}

      {duplicados.length > 0 && (
        <div className="alert alert-info">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          {duplicados.length} XML(s) duplicado(s) da mesma chave foram descartados — cada nota
          entra no ZIP uma única vez.
        </div>
      )}

      {/* Conferidos */}
      <CollapsibleCard icon={CheckCircle} title={`XMLs conferidos (${conferidos.length})`}>
        {conferidos.length === 0 ? (
          <p className="sped-empty">Nenhum XML correspondeu às chaves informadas.</p>
        ) : (
          <div className="sped-table-wrap">
            <table className="data-table">
              <thead><tr><th>Arquivo</th><th>Chave de acesso</th></tr></thead>
              <tbody>
                {conferidos.map(a => (
                  <tr key={a.name}>
                    <td className="mono"><CheckCircle size={13} className="sped-ok-icon" /> {a.name}</td>
                    <td className="mono sped-chave-cell">{a.chave}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleCard>

      {/* Chaves sem XML */}
      {naoEncontradas.length > 0 && (
        <CollapsibleCard icon={FileX2} title={`Chaves sem XML correspondente (${naoEncontradas.length})`}>
          <div className="sped-table-wrap">
            <table className="data-table">
              <thead><tr><th>Chave de acesso</th></tr></thead>
              <tbody>
                {naoEncontradas.map(k => (
                  <tr key={k}><td className="mono sped-chave-cell">{k}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleCard>
      )}

      {/* Duplicados descartados */}
      {duplicados.length > 0 && (
        <CollapsibleCard icon={FileWarning} title={`XMLs duplicados descartados (${duplicados.length})`}>
          <p className="sped-empty" style={{ marginBottom: '.5rem' }}>
            Já havia um XML para estas chaves; os arquivos abaixo não foram incluídos no ZIP:
          </p>
          <div className="sped-table-wrap">
            <table className="data-table">
              <thead><tr><th>Arquivo</th><th>Chave de acesso</th></tr></thead>
              <tbody>
                {duplicados.map(a => (
                  <tr key={a.name}>
                    <td className="mono">{a.name}</td>
                    <td className="mono sped-chave-cell">{a.chave}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleCard>
      )}

      {/* XMLs sem chave legível */}
      {semChave.length > 0 && (
        <CollapsibleCard icon={FileWarning} title={`XMLs sem chave legível (${semChave.length})`}>
          <p className="sped-empty" style={{ marginBottom: '.5rem' }}>
            Não foi possível extrair uma chave de 44 dígitos destes arquivos:
          </p>
          <ul className="sped-list">
            {semChave.map(a => <li key={a.name} className="mono">{a.name}</li>)}
          </ul>
        </CollapsibleCard>
      )}
    </div>
  )
}
