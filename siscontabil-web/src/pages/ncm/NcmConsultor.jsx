import { useState, useEffect, useCallback } from 'react'
import {
  Search, PlusCircle, List, Calculator, Trash2,
  Download, Save, RotateCcw, AlertCircle, CheckCircle,
  Globe, RefreshCw, ChevronLeft, ChevronRight, Bookmark, X, DatabaseBackup,
} from 'lucide-react'
import { downloadXls } from '../../lib/spreadsheet'
import {
  getAllNcm, insertNcm, updateNcm, deleteNcm, searchNcm,
  getLegacyNcm, importLegacyNcm,
  getAllHistorico, insertHistorico, deleteHistorico, clearHistorico,
} from './ncmStorage'
import { useNcmBusca, useNcmSincronizacao } from '../../hooks/useNcmOficial'
import './NcmConsultor.css'

// ── helpers ────────────────────────────────────────────────────────
const fmtBRL  = n => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPct  = n => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%'
const parsePt = s => parseFloat(String(s).replace(',', '.'))

// ── estados helpers ─────────────────────────────────────────────────
const UFS = ['MT', 'PA', 'GO']

function emptyEstados() {
  return {
    MT: { temMva: false, mvaValor: '' },
    PA: { temMva: false, mvaValor: '', temAntecipado: false, aliquotaAntecipado: '' },
    GO: { temMva: false, mvaValor: '' },
  }
}

function estadosFromEntry(entry) {
  if (entry?.estados) {
    const mt = entry.estados.MT || {}
    const pa = entry.estados.PA || {}
    const go = entry.estados.GO || {}
    return {
      MT: { temMva: mt.temMva ?? false, mvaValor: mt.mvaValor ?? '' },
      PA: {
        temMva:              pa.temMva ?? false,
        mvaValor:            pa.mvaValor ?? '',
        temAntecipado:       pa.temAntecipado ?? false,
        aliquotaAntecipado:  pa.aliquotaAntecipado ?? '',
      },
      GO: { temMva: go.temMva ?? false, mvaValor: go.mvaValor ?? '' },
    }
  }
  return emptyEstados()
}

function parseEstados(estados) {
  const result = {}
  for (const uf of UFS) {
    const e = estados[uf]
    const mvaValor = e.temMva ? parsePt(e.mvaValor) : null
    if (e.temMva && (isNaN(mvaValor) || mvaValor < 0))
      throw new Error(`MVA inválido para ${uf}`)
    result[uf] = { temMva: e.temMva, mvaValor }
    if (uf === 'PA') {
      const aq = e.temAntecipado ? parsePt(e.aliquotaAntecipado) : null
      if (e.temAntecipado && (isNaN(aq) || aq < 0))
        throw new Error('Alíquota antecipado inválida para PA')
      result[uf].temAntecipado       = e.temAntecipado
      result[uf].aliquotaAntecipado  = aq
    }
  }
  return result
}

function temQualquerMva(entry) {
  if (entry.estados) return UFS.some(uf => entry.estados[uf]?.temMva)
  return entry.temMva
}

function renderEstadosBadges(entry) {
  if (!entry.estados) {
    if (entry.temMva) return [{ key: 'legacy', label: `MVA: ${fmtPct(entry.mvaValor ?? 0)}`, cor: 'badge-yellow' }]
    return []
  }
  const badges = []
  UFS.forEach(uf => {
    const e = entry.estados[uf]
    if (e?.temMva) badges.push({ key: `${uf}-mva`, label: `${uf} ${fmtPct(e.mvaValor ?? 0)}`, cor: 'badge-yellow' })
    if (uf === 'PA' && e?.temAntecipado)
      badges.push({ key: 'pa-ant', label: `PA Antec. ${fmtPct(e.aliquotaAntecipado ?? 0)}`, cor: 'badge-blue' })
  })
  return badges
}

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
  const { resultados, paginacao, carregando, erro, buscar } = useNcmBusca()
  const { status, sincronizando, resultado, erro: erroSync, carregarStatus, sincronizar } =
    useNcmSincronizacao()

  const [busca,      setBusca]      = useState('')
  const [pagina,     setPagina]     = useState(1)
  const [offline,    setOffline]    = useState(false)
  const [dadosLocais, setDadosLocais] = useState({})
  const [selecionado, setSelecionado] = useState(null)

  useEffect(() => {
    carregarStatus().catch(() => setOffline(true))
  }, [carregarStatus])

  const carregarDadosLocais = useCallback(async () => {
    try {
      const lista = await getAllNcm()
      const map = {}
      lista.forEach(n => { map[n.ncm] = n })
      setDadosLocais(map)
    } catch {
      setDadosLocais({})
    }
  }, [])

  useEffect(() => { carregarDadosLocais() }, [carregarDadosLocais])

  function onBusca(e) {
    const v = e.target.value
    setBusca(v)
    setPagina(1)
    setSelecionado(null)
    buscar(v, 1)
  }

  function irPagina(p) {
    setPagina(p)
    setSelecionado(null)
    buscar(busca, p)
  }

  function toggleSelecionado(ncm) {
    setSelecionado(prev => prev?.id === ncm.id ? null : ncm)
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
            Mínimo 2 caracteres · busca por código e descrição · clique em <Bookmark size={12} style={{ verticalAlign: 'middle' }} /> para anotar dados fiscais
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
                    <th>Status</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Dados Fiscais</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map(ncm => {
                    const temDados   = !!dadosLocais[ncm.codigo]
                    const ativo      = selecionado?.id === ncm.id
                    return (
                      <tr key={ncm.id} className={ativo ? 'tr-selecionada' : ''}>
                        <td className="mono">{ncm.codigo}</td>
                        <td>{ncm.descricao}</td>
                        <td style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{ncm.vigencia || '—'}</td>
                        <td>
                          {ncm.ativo
                            ? <span className="badge badge-green">Vigente</span>
                            : <span className="badge badge-gray">Revogado</span>
                          }
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className={`btn-bookmark ${temDados ? 'btn-bookmark--ativo' : ''} ${ativo ? 'btn-bookmark--aberto' : ''}`}
                            title={temDados ? 'Editar dados fiscais' : 'Anotar dados fiscais'}
                            onClick={() => toggleSelecionado(ncm)}
                          >
                            <Bookmark size={15} />
                            {temDados && <span className="bookmark-dot" />}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {selecionado && (
              <AnotacaoFiscalPanel
                ncmOficial={selecionado}
                dadoExistente={dadosLocais[selecionado.codigo] ?? null}
                onSalvar={() => { carregarDadosLocais(); setSelecionado(null) }}
                onFechar={() => setSelecionado(null)}
              />
            )}

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

// ── Painel de anotação fiscal (usado dentro da Tabela Oficial) ──────
function AnotacaoFiscalPanel({ ncmOficial, dadoExistente, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nomeProduto:          dadoExistente?.nomeProduto ?? ncmOficial?.descricao?.substring(0, 80) ?? '',
    tributadoNormalmente: dadoExistente?.tributadoNormalmente ?? false,
    resultadoEconect:     dadoExistente?.resultadoEconect ?? '',
    estados:              estadosFromEntry(dadoExistente),
  })
  const [msg, setMsg]           = useState(null)
  const [salvando, setSalvando] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setMsg(null) }

  async function salvar() {
    if (!form.nomeProduto.trim()) {
      setMsg({ type: 'error', text: 'Informe o nome/apelido do produto.' })
      return
    }
    let estadosParsed
    try { estadosParsed = parseEstados(form.estados) }
    catch (e) { setMsg({ type: 'error', text: e.message }); return }

    const entry = {
      ncm:                  ncmOficial.codigo,
      nomeProduto:          form.nomeProduto.trim(),
      tributadoNormalmente: form.tributadoNormalmente,
      resultadoEconect:     form.resultadoEconect.trim(),
      estados:              estadosParsed,
    }
    setSalvando(true)
    try {
      dadoExistente ? await updateNcm(dadoExistente.id, entry) : await insertNcm(entry)
      onSalvar()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
      setSalvando(false)
    }
  }

  return (
    <div className="ncm-anotacao-panel">
      <div className="ncm-anotacao-header">
        <span>
          <Bookmark size={14} style={{ color: 'var(--green)', verticalAlign: 'middle', marginRight: '.4rem', fill: 'var(--green)' }} />
          Dados fiscais — <strong className="mono">{ncmOficial.codigo}</strong>
          <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '.5rem', fontSize: '.82rem' }}>
            {ncmOficial.descricao}
          </span>
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onFechar}><X size={14} /></button>
      </div>

      <div className="field-row cols-2" style={{ marginTop: '.75rem' }}>
        <div className="field">
          <label>Nome / Apelido do Produto *</label>
          <input type="text" placeholder="Como você identifica este produto"
            value={form.nomeProduto} onChange={e => set('nomeProduto', e.target.value)} />
        </div>
        <div className="field">
          <label>Resultado Econect</label>
          <input type="text" placeholder="Ex: ST, DIFAL, NORMAL, ISENTO…"
            value={form.resultadoEconect} onChange={e => set('resultadoEconect', e.target.value)} />
        </div>
      </div>

      <div className="field" style={{ marginBottom: '.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.tributadoNormalmente}
            onChange={e => set('tributadoNormalmente', e.target.checked)} />
          Tributado Normalmente?
        </label>
      </div>

      <div className="field">
        <label>ST / MVA e Antecipação por Estado</label>
        <EstadosGrid estados={form.estados}
          onChange={v => { setForm(f => ({ ...f, estados: v })); setMsg(null) }} />
      </div>

      {msg && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}
          style={{ marginBottom: '.75rem' }}>
          {msg.type === 'error'
            ? <AlertCircle size={15} style={{ flexShrink: 0 }} />
            : <CheckCircle size={15} style={{ flexShrink: 0 }} />}
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '.6rem' }}>
        <button className="btn btn-primary btn-sm" onClick={salvar} disabled={salvando}>
          <Save size={14} /> {salvando ? 'Salvando…' : (dadoExistente ? 'Atualizar' : 'Salvar dados fiscais')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  )
}

// ── Aba: Consulta ───────────────────────────────────────────────────
function ConsultaTab() {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState([])
  const [searched,  setSearched]  = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro,      setErro]      = useState(null)

  async function buscar(q) {
    const t = q.trim()
    setSearched(!!t)
    setErro(null)
    if (!t) { setResults([]); return }
    setCarregando(true)
    try {
      setResults(await searchNcm(t))
    } catch (e) {
      setErro(e.message)
      setResults([])
    } finally {
      setCarregando(false)
    }
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
        <span className="hint">Pesquisa na base cadastrada (servidor).</span>
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

      {!carregando && !erro && searched && results.length === 0 && (
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
                <th>ST / MVA por Estado</th>
                <th>Econect</th>
                <th>Trib. Normal</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => {
                const badges = renderEstadosBadges(r)
                return (
                  <tr key={r.id}>
                    <td className="mono">{r.ncm}</td>
                    <td>{r.nomeProduto}</td>
                    <td>
                      {badges.length > 0
                        ? <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                            {badges.map(b => <span key={b.key} className={`badge ${b.cor}`}>{b.label}</span>)}
                          </div>
                        : <span className="badge badge-gray">—</span>
                      }
                    </td>
                    <td>{r.resultadoEconect || '—'}</td>
                    <td>{r.tributadoNormalmente
                      ? <span className="badge badge-blue">Sim</span>
                      : <span className="badge badge-gray">Não</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Aba: Cadastro ───────────────────────────────────────────────────
function emptyForm() {
  return { ncm: '', nomeProduto: '', tributadoNormalmente: false, resultadoEconect: '', estados: emptyEstados() }
}

function CadastroTab({ onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [msg,  setMsg]  = useState(null)
  const [salvando, setSalvando] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setMsg(null) }

  async function salvar() {
    if (!form.ncm.trim() || !form.nomeProduto.trim()) {
      setMsg({ type: 'error', text: 'NCM e Nome do Produto são obrigatórios.' })
      return
    }
    let estadosParsed
    try { estadosParsed = parseEstados(form.estados) }
    catch (e) { setMsg({ type: 'error', text: e.message }); return }

    setSalvando(true)
    try {
      await insertNcm({
        ncm:                  form.ncm.trim(),
        nomeProduto:          form.nomeProduto.trim(),
        tributadoNormalmente: form.tributadoNormalmente,
        resultadoEconect:     form.resultadoEconect.trim(),
        estados:              estadosParsed,
      })
      setMsg({ type: 'success', text: 'NCM cadastrada com sucesso!' })
      setForm(emptyForm())
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setSalvando(false)
    }
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
          <label>Resultado Econect</label>
          <input type="text" placeholder="Ex: ST, DIFAL, NORMAL…"
            value={form.resultadoEconect}
            onChange={e => set('resultadoEconect', e.target.value)} />
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
        <label>ST / MVA e Antecipação por Estado</label>
        <EstadosGrid estados={form.estados}
          onChange={v => { setForm(f => ({ ...f, estados: v })); setMsg(null) }} />
      </div>

      {msg && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}
          style={{ marginBottom: '1rem' }}>
          {msg.type === 'error'
            ? <AlertCircle size={15} style={{ flexShrink: 0 }} />
            : <CheckCircle size={15} style={{ flexShrink: 0 }} />}
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '.75rem' }}>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
          <Save size={15} /> {salvando ? 'Salvando…' : 'Salvar NCM'}
        </button>
        <button className="btn btn-ghost" onClick={() => { setForm(emptyForm()); setMsg(null) }}>
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
  const [carregando, setCarregando] = useState(true)
  const [erro,       setErro]       = useState(null)
  const [legado,     setLegado]     = useState(getLegacyNcm().length)
  const [importando, setImportando] = useState(false)

  const load = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setData(await getAllNcm())
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const visible = data.filter(x => {
    const t = search.toLowerCase()
    const matchSearch = !t || x.ncm.toLowerCase().includes(t) || x.nomeProduto.toLowerCase().includes(t)
    const matchMva = filter === 'Todos' ? true : filter === 'Com MVA' ? temQualquerMva(x) : !temQualquerMva(x)
    return matchSearch && matchMva
  })

  async function excluir(id) {
    if (!confirm('Excluir este NCM?')) return
    try {
      await deleteNcm(id)
      await load()
    } catch (e) {
      setErro(e.message)
    }
  }

  async function importarLocais() {
    if (!confirm(`Importar ${legado} registro(s) do navegador para o servidor? Os dados locais serão removidos após a importação.`)) return
    setImportando(true)
    try {
      await importLegacyNcm()
      setLegado(0)
      await load()
    } catch (e) {
      setErro(e.message)
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span><List size={16} /> Listagem de NCMs</span>
        <span className="badge badge-gray">{data.length} registros</span>
      </div>

      {legado > 0 && (
        <div className="alert alert-info pc-import-banner" style={{ marginBottom: '1rem' }}>
          <DatabaseBackup size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>{legado} registro(s)</strong> no armazenamento local deste navegador.
            Importe-os para o servidor para compartilhar com a equipe.
          </div>
          <button className="btn btn-primary btn-sm" onClick={importarLocais} disabled={importando}>
            <DatabaseBackup size={14} /> {importando ? 'Importando…' : 'Importar dados locais'}
          </button>
        </div>
      )}

      {erro && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          {erro}
        </div>
      )}

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

      {carregando ? (
        <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>Carregando…</p>
      ) : visible.length === 0 ? (
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
                <th>ST / MVA por Estado</th>
                <th>Econect</th>
                <th>Trib. Normal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => {
                const badges = renderEstadosBadges(r)
                return (
                  <tr key={r.id}>
                    <td className="mono">{r.ncm}</td>
                    <td>{r.nomeProduto}</td>
                    <td>
                      {badges.length > 0
                        ? <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                            {badges.map(b => <span key={b.key} className={`badge ${b.cor}`}>{b.label}</span>)}
                          </div>
                        : <span className="badge badge-gray">—</span>
                      }
                    </td>
                    <td>{r.resultadoEconect || '—'}</td>
                    <td>{r.tributadoNormalmente
                      ? <span className="badge badge-blue">Sim</span>
                      : <span className="badge badge-gray">Não</span>}
                    </td>
                    <td>
                      <button className="btn-icon-red" onClick={() => excluir(r.id)} title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Componente: grid de MVA/antecipação por estado ──────────────────
function EstadosGrid({ estados, onChange }) {
  function set(uf, campo, valor) {
    onChange({ ...estados, [uf]: { ...estados[uf], [campo]: valor } })
  }

  return (
    <div className="estados-grid">
      <div className="estados-grid-head">
        <span>UF</span>
        <span>Tem ST / MVA?</span>
        <span>MVA %</span>
        <span>Antecipado? <span className="estados-pa-note">(PA)</span></span>
        <span>Alíq. Antecip. %</span>
      </div>
      {UFS.map(uf => (
        <div key={uf} className="estados-grid-row">
          <span className="uf-label">{uf}</span>
          <label className="estados-check">
            <input type="checkbox" checked={estados[uf].temMva}
              onChange={e => set(uf, 'temMva', e.target.checked)} />
          </label>
          <input
            type="text"
            className="input-sm"
            placeholder="Ex: 30,37"
            disabled={!estados[uf].temMva}
            value={estados[uf].mvaValor}
            onChange={e => set(uf, 'mvaValor', e.target.value)}
          />
          {uf === 'PA' ? (
            <>
              <label className="estados-check">
                <input type="checkbox" checked={estados.PA.temAntecipado}
                  onChange={e => set('PA', 'temAntecipado', e.target.checked)} />
              </label>
              <input
                type="text"
                className="input-sm"
                placeholder="Ex: 15,00"
                disabled={!estados.PA.temAntecipado}
                value={estados.PA.aliquotaAntecipado}
                onChange={e => set('PA', 'aliquotaAntecipado', e.target.value)}
              />
            </>
          ) : (
            <>
              <span className="estados-na">—</span>
              <span className="estados-na">—</span>
            </>
          )}
        </div>
      ))}
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
