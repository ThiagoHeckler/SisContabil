import { useState } from 'react'
import { Calculator, RotateCcw, Info } from 'lucide-react'
import './DifalCalculator.css'

const ALQ_INTERNAS = [
  { label: '17% – geral',                    value: 0.17 },
  { label: '12% – reduzida',                 value: 0.12 },
  { label: '25% – cigarros / bebidas',        value: 0.25 },
  { label: '30% – energia elétrica (>200kWh)',value: 0.30 },
]

const ALQ_INTERESTADUAIS = [
  { label: '7% – Sul/Sudeste (exceto ES)',    value: 0.07 },
  { label: '12% – Norte/Nordeste/CO/ES',      value: 0.12 },
  { label: '4% – importado (Res. 13/2012)',   value: 0.04 },
]

function parseBRL(str) {
  if (!str) return NaN
  const s = str.trim().replace(/\s/g, '')
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s))
    return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  return parseFloat(s.replace(',', '.'))
}

function fmtBRL(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPct(n) {
  return (n * 100).toFixed(2).replace('.', ',') + '%'
}

function getAlq(selectVal, manualVal) {
  const m = manualVal.trim()
  if (m !== '') {
    const v = parseBRL(m)
    if (!isNaN(v) && v > 0 && v < 100) return v / 100
    return NaN
  }
  return selectVal !== '' ? parseFloat(selectVal) : NaN
}

const EMPTY = {
  vOper: '', alqInterna: '', alqInternaManual: '',
  alqInter: '', alqInterManual: '', icmsOrigem: '',
}

export default function DifalCalculator() {
  const [form, setForm] = useState(EMPTY)
  const [result, setResult] = useState(null)
  const [errors, setErrors] = useState([])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setResult(null)
    setErrors([])
  }

  function calcular() {
    const vOper   = parseBRL(form.vOper)
    const alqInt  = getAlq(form.alqInterna, form.alqInternaManual)
    const alqIest = getAlq(form.alqInter,   form.alqInterManual)

    const errs = []
    if (isNaN(vOper) || vOper <= 0)  errs.push('Informe um valor de operação válido.')
    if (isNaN(alqInt))               errs.push('Selecione ou informe a alíquota interna.')
    if (isNaN(alqIest))              errs.push('Selecione ou informe a alíquota interestadual.')
    if (!isNaN(alqIest) && !isNaN(alqInt) && alqIest >= alqInt)
      errs.push('Alíquota interestadual deve ser menor que a interna para gerar DIFAL positivo.')
    if (errs.length) { setErrors(errs); return }

    let icmsOrigem = form.icmsOrigem.trim() !== ''
      ? parseBRL(form.icmsOrigem)
      : vOper * alqIest

    const bc          = (vOper - icmsOrigem) / (1 - alqInt)
    const icmsInterno = bc * alqInt
    const icmsIest    = vOper * alqIest
    const difal       = Math.max(0, icmsInterno - icmsIest)

    setResult({ vOper, alqInt, alqIest, icmsOrigem, bc, icmsInterno, icmsIest, difal })
  }

  function limpar() {
    setForm(EMPTY)
    setResult(null)
    setErrors([])
  }

  return (
    <div>
      <div className="page-header">
        <h1><Calculator size={22} /> Calculadora DIFAL</h1>
        <p>Diferencial de Alíquota — cálculo <strong>por dentro</strong> para Mato Grosso</p>
      </div>

      <div className="difal-layout">
        {/* Formulário */}
        <div className="card">
          <div className="card-title"><Calculator size={16} /> Parâmetros da operação</div>

          <div className="field">
            <label>Valor da operação (R$)</label>
            <input type="text" placeholder="Ex: 10.000,00" value={form.vOper}
              onChange={e => set('vOper', e.target.value)} />
          </div>

          <div className="field-row cols-2">
            <div className="field">
              <label>Alíquota interna MT</label>
              <select value={form.alqInterna} onChange={e => set('alqInterna', e.target.value)}>
                <option value="">— selecione —</option>
                {ALQ_INTERNAS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <span className="hint">ou informe manualmente:</span>
              <input type="text" placeholder="Ex: 17" value={form.alqInternaManual}
                onChange={e => set('alqInternaManual', e.target.value)} />
            </div>

            <div className="field">
              <label>Alíquota interestadual</label>
              <select value={form.alqInter} onChange={e => set('alqInter', e.target.value)}>
                <option value="">— selecione —</option>
                {ALQ_INTERESTADUAIS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <span className="hint">ou informe manualmente:</span>
              <input type="text" placeholder="Ex: 12" value={form.alqInterManual}
                onChange={e => set('alqInterManual', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>ICMS destacado na NF-e origem (R$) — opcional</label>
            <input type="text" placeholder="Deixe vazio para calcular automaticamente"
              value={form.icmsOrigem} onChange={e => set('icmsOrigem', e.target.value)} />
            <span className="hint">Se vazio, usa V_oper × ALQ interestadual.</span>
          </div>

          {errors.length > 0 && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <ul style={{ paddingLeft: '1rem' }}>
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', gap: '.75rem' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={calcular}>
              <Calculator size={16} /> Calcular
            </button>
            <button className="btn btn-ghost" onClick={limpar}>
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Resultado */}
        {result && (
          <div className="card difal-result">
            <div className="card-title">Resultado</div>

            <div className="difal-formula">
              <p className="difal-formula__label">Fórmula aplicada (por dentro):</p>
              <p className="difal-formula__eq">
                DIFAL = [(V<sub>oper</sub> − ICMS<sub>origem</sub>) ÷ (1 − ALQ<sub>int</sub>)]
                × ALQ<sub>int</sub> − (V<sub>oper</sub> × ALQ<sub>iest</sub>)
              </p>
            </div>

            <table className="data-table">
              <tbody>
                <tr>
                  <td>Valor da operação</td>
                  <td className="right">{fmtBRL(result.vOper)}</td>
                </tr>
                <tr>
                  <td>ICMS origem</td>
                  <td className="right">{fmtBRL(result.icmsOrigem)}</td>
                </tr>
                <tr>
                  <td>Base de cálculo por dentro</td>
                  <td className="right">{fmtBRL(result.bc)}</td>
                </tr>
                <tr>
                  <td>ICMS interno (destino MT)</td>
                  <td className="right">{fmtBRL(result.icmsInterno)}</td>
                </tr>
                <tr>
                  <td>ICMS interestadual</td>
                  <td className="right">{fmtBRL(result.icmsIest)}</td>
                </tr>
                <tr className="result-highlight">
                  <td>DIFAL a recolher (MT)</td>
                  <td className="right">{fmtBRL(result.difal)}</td>
                </tr>
              </tbody>
            </table>

            <p className="difal-alqs">
              ALQ interna: {fmtPct(result.alqInt)} &nbsp;|&nbsp; ALQ interestadual: {fmtPct(result.alqIest)}
            </p>
          </div>
        )}

        {/* Explicação */}
        <div className="card difal-info">
          <div className="card-title"><Info size={16} /> Como funciona o cálculo por dentro</div>
          <p>No método <strong>por dentro</strong>, o próprio ICMS integra sua base de cálculo.
            O valor da operação já embute o imposto, por isso é necessário "grossear" a base:</p>
          <ol>
            <li>Subtrai-se o ICMS pago na origem do valor da operação.</li>
            <li>Divide-se pelo complemento da alíquota interna (1 − ALQ<sub>int</sub>)
                para obter a base cheia.</li>
            <li>Aplica-se a alíquota interna sobre essa base → ICMS do destino.</li>
            <li>Deduz-se o ICMS interestadual já pago pelo remetente → <strong>DIFAL</strong>.</li>
          </ol>
          <p className="difal-info__note">
            Base legal: art. 13, §1º, I da LC 87/96 · Convênio ICMS 236/2021 ·
            RICMS-MT (Dec. 2.212/2014).
          </p>
        </div>
      </div>
    </div>
  )
}
