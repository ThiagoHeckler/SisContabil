import { useState, useCallback } from 'react'
import { FileSpreadsheet, Upload, Download, Trash2, FileX, CheckCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { parseNfe } from './nfeParser'
import './NfeConverter.css'

export default function NfeConverter() {
  const [notas, setNotas] = useState([])
  const [dragging, setDragging] = useState(false)
  const [erros, setErros] = useState([])

  async function processFiles(files) {
    const xmlFiles = Array.from(files).filter(f =>
      f.name.toLowerCase().endsWith('.xml')
    )
    if (!xmlFiles.length) {
      setErros(e => [...e, 'Nenhum arquivo XML encontrado nos arquivos selecionados.'])
      return
    }

    const newErros = []
    const newNotas = []

    await Promise.all(xmlFiles.map(async file => {
      try {
        const text = await file.text()
        const nota = parseNfe(text, file.name)
        newNotas.push(nota)
      } catch (err) {
        newErros.push(`${file.name}: ${err.message}`)
      }
    }))

    setNotas(prev => {
      const existingChaves = new Set(prev.map(n => n.chave))
      const unique = newNotas.filter(n => !existingChaves.has(n.chave))
      return [...prev, ...unique]
    })
    setErros(e => [...e, ...newErros])
  }

  const onDrop = useCallback(async e => {
    e.preventDefault()
    setDragging(false)
    await processFiles(e.dataTransfer.files)
  }, [])

  async function onFileInput(e) {
    await processFiles(e.target.files)
    e.target.value = ''
  }

  function remover(idx) {
    setNotas(n => n.filter((_, i) => i !== idx))
  }

  function limparTudo() {
    setNotas([])
    setErros([])
  }

  function exportar() {
    if (!notas.length) return

    const rows = notas.map(n => ({
      'Chave NF-e':         n.chave,
      'Número NF':          n.nNF,
      'Série':              n.serie,
      'Data Emissão':       n.dhEmi,
      'CNPJ Emitente':      n.cnpjEmit,
      'Emitente':           n.xNomeEmit,
      'UF Emitente':        n.ufEmit,
      'CNPJ/CPF Destinatário': n.cnpjDest,
      'Destinatário':       n.xNomeDest,
      'UF Destinatário':    n.ufDest,
      'Natureza Op.':       n.natOp,
      'Finalidade':         n.finNFe,
      'Qtd Itens':          n.qtdItens,
      'Vl. Produtos (R$)':  n.vProd,
      'Vl. Frete (R$)':     n.vFrete,
      'Vl. Desconto (R$)':  n.vDesc,
      'Vl. IPI (R$)':       n.vIPI,
      'Vl. ICMS (R$)':      n.vICMS,
      'Vl. PIS (R$)':       n.vPIS,
      'Vl. COFINS (R$)':    n.vCOFINS,
      'Vl. Total NF (R$)':  n.vNF,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)

    // larguras aproximadas das colunas
    ws['!cols'] = [
      { wch: 46 }, { wch: 10 }, { wch: 6 }, { wch: 20 }, { wch: 18 },
      { wch: 30 }, { wch: 6 }, { wch: 20 }, { wch: 30 }, { wch: 6 },
      { wch: 25 }, { wch: 18 }, { wch: 9 }, { wch: 16 }, { wch: 14 },
      { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 16 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'NF-e')

    const hoje = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `nfe_export_${hoje}.xlsx`)
  }

  const fmtBRL = n => isNaN(n) ? '-' :
    Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div>
      <div className="page-header">
        <h1><FileSpreadsheet size={22} /> Conversor NF-e</h1>
        <p>Importe XMLs de NF-e e exporte como planilha Excel (.xlsx).</p>
      </div>

      {/* Dropzone */}
      <div
        className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Upload size={32} className="dropzone__icon" />
        <p className="dropzone__title">Arraste XMLs de NF-e aqui</p>
        <p className="dropzone__sub">ou</p>
        <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
          Selecionar arquivos
          <input
            type="file" accept=".xml" multiple hidden
            onChange={onFileInput}
          />
        </label>
        <p className="dropzone__hint">Aceita múltiplos XMLs simultaneamente</p>
      </div>

      {/* Erros de parsing */}
      {erros.length > 0 && (
        <div className="alert alert-warn" style={{ marginBottom: '1rem' }}>
          <FileX size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Avisos de importação:</strong>
            <ul style={{ paddingLeft: '1rem', marginTop: '.25rem' }}>
              {erros.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Tabela de notas */}
      {notas.length > 0 && (
        <div className="card nfe-result">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span><CheckCircle size={16} /> {notas.length} nota(s) importada(s)</span>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={exportar}>
                <Download size={14} /> Exportar Excel
              </button>
              <button className="btn btn-ghost btn-sm" onClick={limparTudo}>
                <Trash2 size={14} /> Limpar
              </button>
            </div>
          </div>

          <div className="nfe-table-wrap">
            <table className="data-table nfe-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Data</th>
                  <th>Emitente</th>
                  <th>Destinatário</th>
                  <th>Natureza</th>
                  <th className="right">Vl. Total</th>
                  <th className="right">ICMS</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {notas.map((n, i) => (
                  <tr key={i}>
                    <td className="mono">{n.nNF}/{n.serie}</td>
                    <td>{n.dhEmi}</td>
                    <td>
                      <span className="nfe-name">{n.xNomeEmit}</span>
                      <span className="nfe-uf">{n.ufEmit}</span>
                    </td>
                    <td>
                      <span className="nfe-name">{n.xNomeDest}</span>
                      <span className="nfe-uf">{n.ufDest}</span>
                    </td>
                    <td>{n.natOp}</td>
                    <td className="right">{fmtBRL(n.vNF)}</td>
                    <td className="right">{fmtBRL(n.vICMS)}</td>
                    <td>
                      <button className="btn-icon" onClick={() => remover(i)} title="Remover">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card nfe-info">
        <div className="card-title">Campos exportados</div>
        <div className="nfe-fields-grid">
          {[
            'Chave NF-e (44 dígitos)', 'Número e Série', 'Data de Emissão',
            'CNPJ e Nome Emitente', 'UF Emitente', 'CNPJ/CPF e Nome Destinatário',
            'UF Destinatário', 'Natureza da Operação', 'Finalidade',
            'Qtd de Itens', 'Vl. Produtos', 'Vl. Frete', 'Vl. Desconto',
            'Vl. IPI', 'Vl. ICMS', 'Vl. PIS', 'Vl. COFINS', 'Vl. Total NF',
          ].map(f => (
            <span key={f} className="nfe-field-tag">{f}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
