import { useState, useEffect, useCallback } from 'react'
import {
  Search, PlusCircle, List, Calculator, Trash2,
  Download, Save, RotateCcw, AlertCircle, CheckCircle,
  Globe, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { downloadXls } from '../../lib/spreadsheet'
import {
  getAllNcm, insertNcm, deleteNcm, searchNcm,
  getAllHistorico, insertHistorico, deleteHistorico, clearHistorico,
} from './ncmStorage'
import { useNcmBusca, useNcmSincronizacao } from '../../hooks/useNcmOficial'
import './NcmConsultor.css'

// ── helpers ────────────────────────────────────────────────────────
const fmtBRL  = n => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPct  = n => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%'
const parsePt = s => parseFloat(String(s).replace(',', '.'))

const TABS = [
  { id: 'oficial',   icon: Globe,      label: 'Tabela Oficial' },
  { id: 'consulta',  icon: Search,     label: 'Consulta Local' },
  { id: 'cadastro',  icon: PlusCircle, label: 'Cadastro'       },
  { id: 'listagem',  icon: List,       label: 'Listagem'       },
  { id: 'calculo',   icon: Calculator, label: 'Cálculo ST'     },
]

export default function NcmConsultor() {
  const [tab, setTab] = useState('consulta')

  return (
    <div>
      <div className="page-header">
        <h1><Search size={22} /> Consultor NCM</h1>
        <p>Cadastre NCMs com regras fiscais próprias, consulte e calcule ST (Pará).</p>
      </div>

      <div className="ncm-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`ncm-tab ${tab === t.id ? 'ncm-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="ncm-body">
        {tab === 'oficial'  && <TabelaOficialTab />}
        {tab === 'consulta' && <ConsultaTab />}
        {tab === 'cadastro' && <CadastroTab onSaved={() => setTab('listagem')} />}
        {tab === 'listagem' && <ListagemTab />}
        {tab === 'calculo'  && <CalculoStTab />}
      </div>
    </div>
  )
}

// ── Aba: Tabela Oficial (Siscomex via Laravel) ──────────────────────
function TabelaOficialTab() {
  const { resultados, paginacao, carregando, erro, buscar, limpar } = useNcmBusca()
  const { status, sincronizando, resultado, erro: erroSync, carregarStatus, sincronizar } =
    useNcmSincronizacao()

  const [busca,   setBusca]   = useState('')
  const [pagina,  setPagina]  = useState(1)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    carregarStatus().catch(() => setOffline(true))
  }, [carregarStatus])

  function onBusca(e) {
    const v = e.target.value
    setBusca(v)
    setPagina(1)
    buscar(v, 1)
  }

  function irPagina(p) {
    setPagina(p)
    buscar(busca, p)
  }

  if (offline) {
    return (
      <div className="card">
        <div className="card-title"><Globe size={16} /> Tabela Oficial NCM (Siscomex)</div>
        <div className="alert alert-warn">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <div>
            <strong>API Laravel não encontrada.</strong><br />
            Inicie o servidor antes de usar esta aba:<br />
            <code style={{ fontSize: '.8rem', background: '#fef3c7', padding: '.1rem .35rem', borderRadius: 4 }}>
              cd siscontabil-api &amp;&amp; php artisan serve
            </code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Status + Sincronização */}
      <div className="card ncm-oficial-header">
        <div className="ncm-status-row">
          <div>
            <Globe size={16} style={{ verticalAlign: 'middle', marginRight: '.35rem', color: 'var(--green)' }} />
            <strong>Tabela Oficial NCM — Siscomex</strong>
          </div>
          <div className="ncm-status-chips">
            {status ? (
              <>
                <span className={`badge ${status.sincronizado ? 'badge-green' : 'badge-yellow'}`}>
                  {status.sincronizado
                    ? `${Number(status.total).toLocaleString('pt-BR')} registros`
                    : 'Não sincronizado'}
                </span>
                {status.vigencia && (
                  <span className="badge badge-blue">{status.vigencia}</span>
                )}
              </>
            ) : (
              <span className="badge badge-gray">Carregando…</span>
            )}
          </div>
        </div>

        {!status?.sincronizado && (
          <div className="alert alert-info" style={{ marginTop: '.75rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            Banco vazio. Clique em <strong>Sincronizar</strong> para baixar os ~11k NCMs da Receita Federal.
          </div>
        )}

        {resultado && (
          <div className="alert alert-success" style={{ marginTop: '.75rem' }}>
            <CheckCircle size={15} style={{ flexShrink: 0 }} />
            Sincronizado em {resultado.duracao_ms}ms ·{' '}
            {Number(resultado.total).toLocaleString('pt-BR')} recebidos ·{' '}
            {resultado.desativados} desativados · {resultado.vigencia}
          </div>
        )}

        {erroSync && (
          <div className="alert alert-error" style={{ marginTop: '.75rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {erroSync}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ marginTop: '.85rem' }}
          onClick={sincronizar}
          disabled={sincronizando}
        >
          <RefreshCw size={15} className={sincronizando ? 'spin-icon' : ''} />
          {sincronizando ? 'Sincronizando… (aguarde)' : 'Sincronizar com Siscomex'}
        </button>
      </div>

      {/* Busca */}
      <div className="card">
        <div className="card-title"><Search size={16} /> Pesquisar NCM Oficial</div>
        <div className="field">
          <input
            type="search"
            placeholder="Código (ex: 0101.21) ou descrição (ex: cavalos)…"
            value={busca}
            onChange={onBusca}
            disabled={!status?.sincronizado}
          />
          <span className="hint">
            Mínimo 2 caracteres · busca por código e descrição
          </span>
        </div>

        {carregando && (
          <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>Buscando…</p>
        )}

        {erro && (
          <div className="alert alert-error">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {erro}
          </div>
        )}

        {resultados.length > 0 && (
          <>
            <div className="ncm-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Vigência</th>
                    <th>Ativo</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map(ncm => (
                    <tr key={ncm.id}>
                      <td className="mono">{ncm.codigo}</td>
                      <td>{ncm.descricao}</td>
                      <td style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{ncm.vigencia || '—'}</td>
                      <td>
                        {ncm.ativo
                          ? <span className="badge badge-green">Vigente</span>
                          : <span className="badge badge-gray">Revogado</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {paginacao && paginacao.ultima > 1 && (
              <div className="ncm-paginacao">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={paginacao.atual <= 1}
                  onClick={() => irPagina(paginacao.atual - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
                  Página {paginacao.atual} de {paginacao.ultima}
                  {' '}({Number(paginacao.total).toLocaleString('pt-BR')} resultados)
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={paginacao.atual >= paginacao.ultima}
                  onClick={() => irPagina(paginacao.atual + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}

        {!carregando && busca.length >= 2 && resultados.length === 0 && !erro && (
          <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
            Nenhum NCM encontrado para "{busca}".
          </p>
        )}
      </div>
    </div>
  )
}

// ── Aba: Consulta ───────────────────────────────────────────────────
function ConsultaTab() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)

  function buscar(q) {
    const t = q.trim()
    setSearched(!!t)
    setResults(t ? searchNcm(t) : [])
  }

  function onChange(e) {
    const v = e.target.value
    setQuery(v)
    buscar(v)
  }

  return (
    <div className="card">
      <div className="card-title"><Search size={16} /> Consulta Rápida de NCM</div>

      <div className="field">
        <label>NCM ou nome do produto</label>
        <input
          type="search"
          placeholder="Ex: 2008, leite, biscoito…"
          value={query}
          onChange={onChange}
          autoFocus
        />
        <span className="hint">Pesquisa na base local cadastrada.</span>
      </div>

      {searched && results.length === 0 && (
        <div className="alert alert-warn">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          Nenhum NCM encontrado. Acesse a aba <b>Cadastro</b> para adicionar.
        </div>
      )}

      {results.length > 0 && (
        <div className="ncm-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>NCM</th>
                <th>Nome do Produto</th>
                <th>Tem MVA</th>
                <th>MVA %</th>
                <th>Econect</th>
                <th>Trib. Normal</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id}>
                  <td className="mono">{r.ncm}</td>
                  <td>{r.nomeProduto}</td>
                  <td>{r.temMva ? <span className="badge badge-green">Sim</span> : <span className="badge badge-gray">Não</span>}</td>
                  <td>{r.temMva && r.mvaValor != null ? fmtPct(r.mvaValor) : '—'}</td>
                  <td>{r.resultadoEconect || '—'}</td>
                  <td>{r.tributadoNormalmente ? <span className="badge badge-blue">Sim</span> : <span className="badge badge-gray">Não</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Aba: Cadastro ───────────────────────────────────────────────────
const EMPTY_FORM = {
  ncm: '', nomeProduto: '', temMva: false, mvaValor: '',
  tributadoNormalmente: false, resultadoEconect: '',
}

function CadastroTab({ onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [msg,  setMsg]  = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setMsg(null) }

  function salvar() {
    if (!form.ncm.trim() || !form.nomeProduto.trim()) {
      setMsg({ type: 'error', text: 'NCM e Nome do Produto são obrigatórios.' })
      return
    }
    if (form.temMva) {
      const v = parsePt(form.mvaValor)
      if (isNaN(v) || v < 0) {
        setMsg({ type: 'error', text: 'Valor de MVA inválido.' })
        return
      }
    }
    const entry = {
      ncm:                 form.ncm.trim(),
      nomeProduto:         form.nomeProduto.trim(),
      temMva:              form.temMva,
      mvaValor:            form.temMva ? parsePt(form.mvaValor) : null,
      tributadoNormalmente:form.tributadoNormalmente,
      resultadoEconect:    form.resultadoEconect.trim(),
    }
    insertNcm(entry)
    setMsg({ type: 'success', text: 'NCM cadastrada com sucesso!' })
    setForm(EMPTY_FORM)
  }

  return (
    <div className="card">
      <div className="card-title"><PlusCircle size={16} /> Cadastro de NCM</div>

      <div className="field-row cols-2">
        <div className="field">
          <label>NCM *</label>
          <input type="text" placeholder="Ex: 19059090" value={form.ncm}
            onChange={e => set('ncm', e.target.value)} />
        </div>
        <div className="field">
          <label>Nome do Produto *</label>
          <input type="text" placeholder="Ex: Biscoito wafer" value={form.nomeProduto}
            onChange={e => set('nomeProduto', e.target.value)} />
        </div>
      </div>

      <div className="field-row cols-2">
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.temMva}
              onChange={e => set('temMva', e.target.checked)} />
            Tem MVA?
          </label>
          {form.temMva && (
            <input type="text" placeholder="Ex: 30,37" value={form.mvaValor}
              onChange={e => set('mvaValor', e.target.value)}
              style={{ marginTop: '.5rem' }} />
          )}
        </div>
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.tributadoNormalmente}
              onChange={e => set('tributadoNormalmente', e.target.checked)} />
            Tributado Normalmente?
          </label>
        </div>
      </div>

      <div className="field">
        <label>Resultado Econect</label>
        <input type="text" placeholder="Ex: ST, DIFAL, NORMAL…"
          value={form.resultadoEconect}
          onChange={e => set('resultadoEconect', e.target.value)} />
      </div>

      {msg && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}
          style={{ marginBottom: '1rem' }}>
          {msg.type === 'error'
            ? <AlertCircle size={15} style={{ flexShrink: 0 }} />
            : <CheckCircle size={15} style={{ flexShrink: 0 }} />
          }
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '.75rem' }}>
        <button className="btn btn-primary" onClick={salvar}>
          <Save size={15} /> Salvar NCM
        </button>
        <button className="btn btn-ghost" onClick={() => { setForm(EMPTY_FORM); setMsg(null) }}>
          <RotateCcw size={15} /> Limpar
        </button>
      </div>
    </div>
  )
}

// ── Aba: Listagem ───────────────────────────────────────────────────
function ListagemTab() {
  const [data,   setData]   = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Todos')

  const load = useCallback(() => setData(getAllNcm()), [])
  useEffect(() => { load() }, [load])

  const visible = data.filter(x => {
    const t = search.toLowerCase()
    const matchSearch = !t || x.ncm.toLowerCase().includes(t) || x.nomeProduto.toLowerCase().includes(t)
    const matchMva = filter === 'Todos' ? true : filter === 'Com MVA' ? x.temMva : !x.temMva
    return matchSearch && matchMva
  })

  function excluir(id) {
    if (!confirm('Excluir este NCM?')) return
    deleteNcm(id)
    load()
  }

  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span><List size={16} /> Listagem de NCMs</span>
        <span className="badge badge-gray">{data.length} registros</span>
      </div>

      <div className="field-row cols-2" style={{ marginBottom: '1rem' }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <input type="search" placeholder="Pesquisar nome ou NCM…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option>Todos</option>
            <option>Com MVA</option>
            <option>Sem MVA</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="alert alert-info">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          Nenhum NCM encontrado. Acesse a aba <b>Cadastro</b> para adicionar.
        </div>
      ) : (
        <div className="ncm-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>NCM</th>
                <th>Nome</th>
                <th>MVA</th>
                <th>Trib. Normal</th>
                <th>Econect</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr key={r.id}>
                  <td className="mono">{r.ncm}</td>
                  <td>{r.nomeProduto}</td>
                  <td>
                    {r.temMva
                      ? <span className="badge badge-yellow">{fmtPct(r.mvaValor ?? 0)}</span>
                      : <span className="badge badge-gray">—</span>
                    }
                  </td>
                  <td>{r.tributadoNormalmente
                    ? <span className="badge badge-blue">Sim</span>
                    : <span className="badge badge-gray">Não</span>
                  }</td>
                  <td>{r.resultadoEconect || '—'}</td>
                  <td>
                    <button className="btn-icon-red" onClick={() => excluir(r.id)} title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Aba: Cálculo ST ─────────────────────────────────────────────────
function CalculoStTab() {
  const [nota,     setNota]     = useState('')
  const [base,     setBase]     = useState('')
  const [mva,      setMva]      = useState('')
  const [historico, setHistorico] = useState([])
  const [searchNota, setSearchNota] = useState('')
  const [msg,      setMsg]      = useState(null)

  const load = useCallback(() => setHistorico(getAllHistorico()), [])
  useEffect(() => { load() }, [load])

  function calcular() {
    const bv = parsePt(base)
    const mv = parsePt(mva)

    if (isNaN(bv) || bv <= 0) { setMsg({ type: 'error', text: 'Informe um valor de base válido.' }); return }
    if (isNaN(mv) || mv < 0)  { setMsg({ type: 'error', text: 'Informe um percentual de MVA válido.' }); return }

    const nNota  = nota.trim() || 'S/N'
    const icms   = bv * 0.12
    const baseSt = bv + bv * (mv / 100)
    const icmsSt = baseSt * 0.19 - icms

    insertHistorico({
      nota:    nNota,
      base:    fmtBRL(bv),
      mva:     fmtPct(mv),
      icms:    fmtBRL(icms),
      baseSt:  fmtBRL(baseSt),
      icmsSt:  fmtBRL(icmsSt),
    })
    load()
    setBase('')
    setMva('')
    setMsg({ type: 'success', text: `Cálculo salvo para NF ${nNota}.` })
  }

  function excluir(id) {
    deleteHistorico(id)
    load()
  }

  function limparTudo() {
    if (!confirm('Apagar TODO o histórico de cálculos ST?')) return
    clearHistorico()
    load()
  }

  function exportarExcel() {
    const headers = ['Nota', 'Base Item', 'MVA %', 'ICMS (12%)', 'Base ST', 'ICMS ST (19%)']
    const rows    = visible.map(h => [h.nota, h.base, h.mva, h.icms, h.baseSt, h.icmsSt])
    const hoje    = new Date().toISOString().slice(0, 10)
    downloadXls(headers, rows, `Relatorio_ST_Para_${hoje}.xls`, 'ST Pará')
  }

  const visible = historico.filter(h =>
    !searchNota.trim() || h.nota.toLowerCase().includes(searchNota.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Formulário */}
      <div className="card">
        <div className="card-title"><Calculator size={16} /> Cálculo de ST — Pará (ICMS 12% / ST 19%)</div>

        <div className="field-row cols-2">
          <div className="field">
            <label>Número da Nota</label>
            <input type="text" placeholder="Ex: 12345 (opcional)"
              value={nota} onChange={e => { setNota(e.target.value); setMsg(null) }} />
          </div>
          <div className="field">
            <label>Valor da Base do Item (R$)</label>
            <input type="text" placeholder="Ex: 100,00"
              value={base} onChange={e => { setBase(e.target.value); setMsg(null) }} />
          </div>
        </div>

        <div className="field" style={{ maxWidth: 240 }}>
          <label>Percentual do MVA (%)</label>
          <input type="text" placeholder="Ex: 30,37"
            value={mva} onChange={e => { setMva(e.target.value); setMsg(null) }} />
        </div>

        {msg && (
          <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}
            style={{ marginBottom: '1rem' }}>
            {msg.type === 'error'
              ? <AlertCircle size={15} style={{ flexShrink: 0 }} />
              : <CheckCircle size={15} style={{ flexShrink: 0 }} />
            }
            {msg.text}
          </div>
        )}

        <div className="st-formula-box">
          <b>Fórmulas:</b><br />
          ICMS = Base × 12% &nbsp;|&nbsp;
          Base ST = Base × (1 + MVA%) &nbsp;|&nbsp;
          ICMS ST = (Base ST × 19%) − ICMS
        </div>

        <button className="btn btn-primary" onClick={calcular}>
          <Calculator size={15} /> Calcular e Salvar
        </button>
      </div>

      {/* Histórico */}
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
          <span>Histórico de Cálculos</span>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={exportarExcel}
              disabled={!visible.length}>
              <Download size={13} /> Excel
            </button>
            <button className="btn btn-ghost btn-sm" onClick={limparTudo}>
              <Trash2 size={13} /> Limpar tudo
            </button>
          </div>
        </div>

        <div className="field" style={{ marginBottom: '1rem' }}>
          <input type="search" placeholder="Filtrar por número da nota…"
            value={searchNota} onChange={e => setSearchNota(e.target.value)} />
        </div>

        {visible.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>Nenhum cálculo no histórico.</p>
        ) : (
          <div className="ncm-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nota</th>
                  <th className="right">Base Item</th>
                  <th className="right">MVA %</th>
                  <th className="right">ICMS (12%)</th>
                  <th className="right">Base ST</th>
                  <th className="right">ICMS ST (19%)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(h => (
                  <tr key={h.id}>
                    <td className="mono">{h.nota}</td>
                    <td className="right">{h.base}</td>
                    <td className="right">{h.mva}</td>
                    <td className="right">{h.icms}</td>
                    <td className="right">{h.baseSt}</td>
                    <td className="right"><b>{h.icmsSt}</b></td>
                    <td>
                      <button className="btn-icon-red" onClick={() => excluir(h.id)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
