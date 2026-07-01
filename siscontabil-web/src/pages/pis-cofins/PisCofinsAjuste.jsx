import { useState, useCallback, useEffect } from 'react'
import {
  Percent, Upload, Download, RotateCcw, CheckCircle, AlertCircle,
  ListChecks, PlusCircle, Trash2, Pencil, X,
} from 'lucide-react'
import { lerTabelaXlsx, processarTabela, exportarResultado } from './pisCofinsParser'
import {
  insertRegra, updateRegra, deleteRegra,
  searchRegras, buildRegrasMap, normalizeNcm8,
} from './pisCofinsStorage'
import './PisCofinsAjuste.css'

const TABS = [
  { id: 'processar', icon: Upload,       label: 'Processar Tabela' },
  { id: 'cadastro',  icon: ListChecks,   label: 'Cadastro NCM' },
]

export default function PisCofinsAjuste() {
  const [tab, setTab] = useState('processar')

  return (
    <div>
      <div className="page-header">
        <h1><Percent size={22} /> Ajuste de PIS e COFINS</h1>
        <p>Identifique itens com alíquota zero de PIS/COFINS a partir do NCM e gere a planilha com o enquadramento legal.</p>
      </div>

      <div className="pc-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`pc-tab ${tab === t.id ? 'pc-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="pc-body">
        {tab === 'processar' && <ProcessarTab />}
        {tab === 'cadastro'  && <CadastroTab />}
      </div>
    </div>
  )
}

// ── Aba: Processar Tabela ────────────────────────────────────────────
function ProcessarTab() {
  const [data,     setData]     = useState(null)   // { headers, rows, stats, nomeArquivo }
  const [dragging, setDragging] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function processFile(file) {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Selecione um arquivo .xlsx.')
      return
    }
    setLoading(true)
    setError('')
    setData(null)
    try {
      const { headers, rows } = await lerTabelaXlsx(file)
      const regrasMap = buildRegrasMap()
      const { rows: processadas, stats } = processarTabela(rows, regrasMap)
      setData({ headers, rows: processadas, stats, nomeArquivo: file.name })
    } catch (err) {
      setError(err.message || 'Erro ao processar a planilha.')
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback(async e => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) await processFile(file)
  }, [])

  async function onFileInput(e) {
    const file = e.target.files[0]
    if (file) await processFile(file)
    e.target.value = ''
  }

  function limpar() {
    setData(null)
    setError('')
  }

  function exportar() {
    if (!data) return
    const base = data.nomeArquivo.replace(/\.xlsx$/i, '')
    exportarResultado(data.headers, data.rows, `${base}-PIS-COFINS.xls`)
  }

  return (
    <div>
      {!data && (
        <div
          className={`pc-dropzone ${dragging ? 'pc-dropzone--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {loading ? (
            <div className="pc-loading">
              <span className="pc-spin" />
              <p>Lendo planilha e cruzando com o cadastro de NCMs…</p>
            </div>
          ) : (
            <>
              <Upload size={36} className="pc-dropzone__icon" />
              <p className="pc-dropzone__title">Arraste a planilha .xlsx aqui</p>
              <p className="pc-dropzone__sub">ou</p>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                Selecionar arquivo
                <input type="file" accept=".xlsx" hidden onChange={onFileInput} />
              </label>
              <p className="pc-dropzone__hint">
                Colunas esperadas: Código, NCM, Descrição — 1ª linha é o cabeçalho, dados a partir da 2ª linha
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="card pc-actionbar">
            <div>
              <strong>{data.nomeArquivo}</strong>
              <span className="pc-dest"> — {data.stats.total} item(ns)</span>
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={exportar}>
                <Download size={14} /> Exportar Excel
              </button>
              <button className="btn btn-ghost btn-sm" onClick={limpar}>
                <RotateCcw size={14} /> Nova planilha
              </button>
            </div>
          </div>

          <div className="pc-stats">
            <div className="pc-stat">
              <span className="pc-stat__val">{data.stats.total}</span>
              <span className="pc-stat__lbl">Total itens</span>
            </div>
            <div className="pc-stat pc-stat--dif">
              <span className="pc-stat__val">{data.stats.enquadrados}</span>
              <span className="pc-stat__lbl">Alíquota zero</span>
            </div>
            <div className="pc-stat pc-stat--normal">
              <span className="pc-stat__val">{data.stats.naoEnquadrados}</span>
              <span className="pc-stat__lbl">Sem enquadramento</span>
            </div>
          </div>

          {data.stats.enquadrados === 0 && (
            <div className="alert alert-warn" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              Nenhum item da planilha bateu com um NCM cadastrado. Verifique a aba <b>Cadastro NCM</b>.
            </div>
          )}

          <div className="card">
            <div className="card-title">
              <CheckCircle size={16} />
              Itens processados
              {data.rows.length > 15 && (
                <span className="pc-preview-note">
                  Exibindo 15 de {data.rows.length} — exporte para ver todos
                </span>
              )}
            </div>
            <div className="pc-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{data.headers[0]}</th>
                    <th>{data.headers[1]}</th>
                    <th>{data.headers[2]}</th>
                    <th>Cód. Enquadramento</th>
                    <th>Tabela</th>
                    <th>Lei</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.slice(0, 15).map((r, i) => (
                    <tr key={i}>
                      <td className="mono">{r.codigo}</td>
                      <td className="mono">{r.ncm}</td>
                      <td className="pc-desc-cell" title={r.descricao}>{r.descricao}</td>
                      <td>{r.codigoEnquadramento || '—'}</td>
                      <td>{r.tabela || '—'}</td>
                      <td>{r.lei || '—'}</td>
                      <td>
                        {r.enquadrado
                          ? <span className="pc-ok"><CheckCircle size={14} /> Alíquota 0</span>
                          : <span className="badge badge-gray">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Aba: Cadastro NCM (código de enquadramento, tabela e lei) ───────
function emptyForm() {
  return { ncm: '', descricaoProduto: '', codigoEnquadramento: '', tabela: '', lei: '' }
}

function CadastroTab() {
  const [lista,      setLista]      = useState([])
  const [search,     setSearch]     = useState('')
  const [form,        setForm]      = useState(emptyForm)
  const [editingId,   setEditingId] = useState(null)
  const [msg,         setMsg]       = useState(null)

  const load = useCallback(() => setLista(searchRegras(search)), [search])
  useEffect(() => { load() }, [load])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setMsg(null) }

  function salvar() {
    const ncm8 = normalizeNcm8(form.ncm)
    if (!ncm8 || ncm8.length < 8) { setMsg({ type: 'error', text: 'Informe um NCM válido (8 dígitos).' }); return }
    if (!form.codigoEnquadramento.trim()) { setMsg({ type: 'error', text: 'Informe o código de enquadramento.' }); return }
    if (!form.tabela.trim()) { setMsg({ type: 'error', text: 'Informe a tabela de enquadramento.' }); return }
    if (!form.lei.trim()) { setMsg({ type: 'error', text: 'Informe a lei / base legal.' }); return }

    const entry = {
      ncm:                  ncm8,
      descricaoProduto:     form.descricaoProduto.trim(),
      codigoEnquadramento:  form.codigoEnquadramento.trim(),
      tabela:               form.tabela.trim(),
      lei:                  form.lei.trim(),
    }

    if (editingId) {
      updateRegra(editingId, entry)
      setMsg({ type: 'success', text: 'NCM atualizado com sucesso!' })
    } else {
      insertRegra(entry)
      setMsg({ type: 'success', text: 'NCM cadastrado com sucesso!' })
    }
    setForm(emptyForm())
    setEditingId(null)
    load()
  }

  function editar(r) {
    setForm({
      ncm:                 r.ncm,
      descricaoProduto:    r.descricaoProduto || '',
      codigoEnquadramento: r.codigoEnquadramento,
      tabela:              r.tabela,
      lei:                 r.lei,
    })
    setEditingId(r.id)
    setMsg(null)
  }

  function cancelarEdicao() {
    setForm(emptyForm())
    setEditingId(null)
    setMsg(null)
  }

  function excluir(id) {
    if (!confirm('Excluir este cadastro?')) return
    deleteRegra(id)
    if (editingId === id) cancelarEdicao()
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <div className="card-title">
          {editingId ? <Pencil size={16} /> : <PlusCircle size={16} />}
          {editingId ? 'Editar enquadramento' : 'Cadastrar enquadramento PIS/COFINS por NCM'}
        </div>

        <div className="field-row cols-2">
          <div className="field">
            <label>NCM *</label>
            <input type="text" placeholder="Ex: 04029900" value={form.ncm}
              onChange={e => set('ncm', e.target.value)} />
            <span className="hint">8 dígitos — zeros à esquerda são completados automaticamente.</span>
          </div>
          <div className="field">
            <label>Descrição do produto</label>
            <input type="text" placeholder="Ex: Leite condensado" value={form.descricaoProduto}
              onChange={e => set('descricaoProduto', e.target.value)} />
          </div>
        </div>

        <div className="field-row cols-3">
          <div className="field">
            <label>Código de Enquadramento *</label>
            <input type="text" placeholder="Ex: 121" value={form.codigoEnquadramento}
              onChange={e => set('codigoEnquadramento', e.target.value)} />
          </div>
          <div className="field">
            <label>Tabela *</label>
            <input type="text" placeholder="Ex: Tabela das carnes" value={form.tabela}
              onChange={e => set('tabela', e.target.value)} />
          </div>
          <div className="field">
            <label>Lei / Base Legal *</label>
            <input type="text" placeholder="Ex: 4.3.13" value={form.lei}
              onChange={e => set('lei', e.target.value)} />
          </div>
        </div>

        {msg && (
          <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: '1rem' }}>
            {msg.type === 'error'
              ? <AlertCircle size={15} style={{ flexShrink: 0 }} />
              : <CheckCircle size={15} style={{ flexShrink: 0 }} />}
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn btn-primary" onClick={salvar}>
            <PlusCircle size={15} /> {editingId ? 'Salvar alterações' : 'Cadastrar'}
          </button>
          {editingId && (
            <button className="btn btn-ghost" onClick={cancelarEdicao}>
              <X size={15} /> Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span><ListChecks size={16} /> NCMs cadastrados</span>
          <span className="badge badge-gray">{lista.length} registro(s)</span>
        </div>

        <div className="field">
          <input type="search" placeholder="Pesquisar por NCM, código, tabela ou descrição…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {lista.length === 0 ? (
          <div className="alert alert-info">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            Nenhum NCM cadastrado ainda.
          </div>
        ) : (
          <div className="pc-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>NCM</th>
                  <th>Descrição</th>
                  <th>Cód. Enquadramento</th>
                  <th>Tabela</th>
                  <th>Lei</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map(r => (
                  <tr key={r.id}>
                    <td className="mono">{r.ncm}</td>
                    <td>{r.descricaoProduto || '—'}</td>
                    <td><span className="badge badge-blue">{r.codigoEnquadramento}</span></td>
                    <td>{r.tabela}</td>
                    <td>{r.lei}</td>
                    <td style={{ display: 'flex', gap: '.25rem' }}>
                      <button className="btn-icon-red" onClick={() => editar(r)} title="Editar">
                        <Pencil size={14} />
                      </button>
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
    </div>
  )
}
