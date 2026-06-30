import { useState, useCallback, useMemo } from 'react'
import {
  FileSpreadsheet, Upload, Download, RotateCcw,
  CheckCircle, AlertCircle, Info,
} from 'lucide-react'
import { parseNfe } from './nfeParser'
import { generateExcel } from './excelGenerator'
import './NfeConverter.css'

const fmtBRL = n =>
  Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function getRuleDisplay(ruleType, destUF) {
  if (ruleType === 'ICMS-ST-PAGO') return { label: 'ICMS ST PAGO', cls: 'rule-stpago' }
  if (destUF === 'GO') {
    if (ruleType === 'DIFERENCIAL') return { label: 'DIFAL',   cls: 'rule-difal' }
    if (ruleType === 'ICMS-ST')     return { label: 'NORMAL',  cls: 'rule-normal' }
  }
  const MAP = {
    'ICMS-ST':     { label: 'ICMS-ST',     cls: 'rule-st' },
    'DIFERENCIAL': { label: 'DIFERENCIAL', cls: 'rule-dif' },
    'DIFAL':       { label: 'DIFAL',       cls: 'rule-difal' },
    'NORMAL':      { label: 'NORMAL',      cls: 'rule-normal' },
  }
  return MAP[ruleType] || MAP['NORMAL']
}

export default function NfeConverter() {
  const [data,     setData]     = useState(null)   // { nfeNumber, destUF, items }
  const [dragging, setDragging] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function processFile(file) {
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setError('Selecione um arquivo .xml de NF-e.')
      return
    }
    setLoading(true)
    setError('')
    setData(null)
    try {
      const text = await file.text()
      const result = parseNfe(text)
      setData(result)
    } catch (err) {
      setError(err.message || 'Erro ao processar o arquivo.')
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
    const xml = generateExcel(data.items, data.nfeNumber, data.destUF)
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `NFe-${data.nfeNumber || 'export'}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = useMemo(() => {
    if (!data) return null
    const s = { total: data.items.length, st: 0, dif: 0, difal: 0, normal: 0, stPago: 0, warnings: 0 }
    data.items.forEach(i => {
      if (i.ruleType === 'ICMS-ST-PAGO') s.stPago++
      else if (i.ruleType === 'ICMS-ST')      s.st++
      else if (i.ruleType === 'DIFERENCIAL') s.dif++
      else if (i.ruleType === 'DIFAL')   s.difal++
      else s.normal++
      if (i.warnings.length) s.warnings++
    })
    return s
  }, [data])

  return (
    <div>
      <div className="page-header">
        <h1><FileSpreadsheet size={22} /> Conversor NF-e</h1>
        <p>
          Importe um XML de NF-e, aplique regras fiscais por NCM (PA/GO) e exporte
          planilha Excel com fórmulas de ICMS-ST, DIFERENCIAL e DIFAL.
        </p>
      </div>

      {/* Dropzone */}
      {!data && (
        <div
          className={`nfe-dropzone ${dragging ? 'nfe-dropzone--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {loading ? (
            <div className="nfe-loading">
              <span className="spin-circle" />
              <p>Processando XML e aplicando regras fiscais…</p>
            </div>
          ) : (
            <>
              <Upload size={36} className="nfe-dropzone__icon" />
              <p className="nfe-dropzone__title">Arraste o XML de NF-e aqui</p>
              <p className="nfe-dropzone__sub">ou</p>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                Selecionar arquivo
                <input type="file" accept=".xml" hidden onChange={onFileInput} />
              </label>
              <p className="nfe-dropzone__hint">Aceita NF-e padrão XML (nfeProc ou NFe)</p>
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

      {/* Resultado */}
      {data && stats && (
        <>
          {/* Barra de ações */}
          <div className="card nfe-actionbar">
            <div>
              <strong>NF-e {data.nfeNumber}</strong>
              <span className="nfe-dest"> — Destino: <b>{data.destUF || '?'}</b></span>
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={exportar}>
                <Download size={14} /> Exportar Excel
              </button>
              <button className="btn btn-ghost btn-sm" onClick={limpar}>
                <RotateCcw size={14} /> Nova NF-e
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="nfe-stats">
            <div className="nfe-stat">
              <span className="nfe-stat__val">{stats.total}</span>
              <span className="nfe-stat__lbl">Total itens</span>
            </div>
            <div className="nfe-stat nfe-stat--st">
              <span className="nfe-stat__val">{stats.st}</span>
              <span className="nfe-stat__lbl">{data.destUF === 'GO' ? 'NORMAL' : 'ICMS-ST'}</span>
            </div>
            <div className="nfe-stat nfe-stat--dif">
              <span className="nfe-stat__val">{stats.dif}</span>
              <span className="nfe-stat__lbl">{data.destUF === 'GO' ? 'DIFAL' : 'DIFERENCIAL'}</span>
            </div>
            <div className="nfe-stat nfe-stat--difal">
              <span className="nfe-stat__val">{stats.difal}</span>
              <span className="nfe-stat__lbl">DIFAL</span>
            </div>
            <div className="nfe-stat nfe-stat--normal">
              <span className="nfe-stat__val">{stats.normal}</span>
              <span className="nfe-stat__lbl">NORMAL</span>
            </div>
            {stats.stPago > 0 && (
              <div className="nfe-stat nfe-stat--stpago">
                <span className="nfe-stat__val">{stats.stPago}</span>
                <span className="nfe-stat__lbl">ICMS ST PAGO</span>
              </div>
            )}
          </div>

          {stats.warnings > 0 && (
            <div className="alert alert-warn" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                <b>{stats.warnings} iten(s)</b> processado(s) como NORMAL porque o NCM não
                foi encontrado na base de regras ou a UF não tem regra cadastrada.
              </span>
            </div>
          )}

          {/* Tabela preview */}
          <div className="card">
            <div className="card-title">
              <CheckCircle size={16} />
              Itens da NF-e
              {data.items.length > 15 && (
                <span className="nfe-preview-note">
                  Exibindo 15 de {data.items.length} — exporte para ver todos
                </span>
              )}
            </div>
            <div className="nfe-table-wrap">
              <table className="data-table nfe-table">
                <thead>
                  <tr>
                    <th className="center">#</th>
                    <th>NCM</th>
                    <th>Produto</th>
                    <th className="right">vProd</th>
                    <th className="right">ICMS XML</th>
                    <th className="right">Base Cálc.</th>
                    <th>Regra_Tipo</th>
                    <th className="right">ICMS_Calculado</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.slice(0, 15).map((item, i) => {
                    const rule = getRuleDisplay(item.ruleType, data.destUF)
                    return (
                      <tr key={i}>
                        <td className="center mono nfe-num">{i + 1}</td>
                        <td className="mono">{item.NCM}</td>
                        <td className="nfe-xprod" title={item.xProd}>{item.xProd}</td>
                        <td className="right">{fmtBRL(item.vProd)}</td>
                        <td className="right">{fmtBRL(item.vICMSXml)}</td>
                        <td className="right nfe-basecalc">{fmtBRL(item.baseCalculo)}</td>
                        <td>
                          <span className={`rule-badge ${rule.cls}`}>{rule.label}</span>
                          {item.ruleType === 'ICMS-ST' && data.destUF !== 'GO' && item.formulaParams.usedMva != null && (
                            <span className="rule-mva">MVA {item.formulaParams.usedMva}%</span>
                          )}
                        </td>
                        <td className="right"><b>{fmtBRL(item.calculatedICMS)}</b></td>
                        <td>
                          {item.warnings.length > 0
                            ? <span className="nfe-warn" title={item.warnings.join(', ')}>
                                <AlertCircle size={14} /> Aviso
                              </span>
                            : <span className="nfe-ok"><CheckCircle size={14} /> OK</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info formulas */}
          <div className="card nfe-info">
            <div className="card-title"><Info size={16} /> Fórmulas aplicadas</div>
            <div className="nfe-formula-grid">
              <div className="nfe-formula nfe-formula--st">
                <b>ICMS-ST (PA):</b> (vProd × (1 + MVA%)) × ALQ% − ICMS_XML
              </div>
              <div className="nfe-formula nfe-formula--dif">
                <b>DIFERENCIAL (PA):</b> (vProd × ALQ%) − ICMS_XML
              </div>
              <div className="nfe-formula nfe-formula--difal">
                <b>DIFAL (GO):</b> ((vProd − ICMS_XML) ÷ divisor) × ALQ% − ICMS_XML
              </div>
            </div>
            <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.75rem' }}>
              O Excel exportado contém fórmulas reais referenciadas por célula (SpreadsheetML),
              não apenas valores estáticos.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
