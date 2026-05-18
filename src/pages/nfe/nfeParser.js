function txt(doc, tag) {
  const el = doc.querySelector(tag)
  return el ? el.textContent.trim() : ''
}

function num(doc, tag) {
  const v = parseFloat(txt(doc, tag))
  return isNaN(v) ? 0 : v
}

function fmtDate(s) {
  // "2024-03-15T10:30:00-04:00" → "15/03/2024 10:30"
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d)) return s
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const FINALIDADE = { '1': 'Normal', '2': 'Complementar', '3': 'Ajuste', '4': 'Devolução' }

export function parseNfe(xmlText, filename) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  const parseErr = doc.querySelector('parsererror')
  if (parseErr) throw new Error('XML inválido ou corrompido.')

  // Aceita tanto <nfeProc> quanto <NFe> direto
  const ide   = doc.querySelector('ide')
  const emit  = doc.querySelector('emit')
  const dest  = doc.querySelector('dest')
  const total = doc.querySelector('ICMSTot')
  const infNFe = doc.querySelector('infNFe')

  if (!ide || !emit || !total) throw new Error('Estrutura de NF-e não reconhecida.')

  const chave = infNFe ? (infNFe.getAttribute('Id') || '').replace(/^NFe/, '') : ''
  const qtdItens = doc.querySelectorAll('det').length

  return {
    chave,
    nNF:      txt(ide, 'nNF'),
    serie:    txt(ide, 'serie'),
    dhEmi:    fmtDate(txt(ide, 'dhEmi') || txt(ide, 'dEmi')),
    natOp:    txt(ide, 'natOp'),
    finNFe:   FINALIDADE[txt(ide, 'finNFe')] || txt(ide, 'finNFe'),
    qtdItens,
    cnpjEmit: txt(emit, 'CNPJ'),
    xNomeEmit:txt(emit, 'xNome'),
    ufEmit:   txt(emit, 'UF') || txt(doc.querySelector('enderEmit'), 'UF'),
    cnpjDest: txt(dest, 'CNPJ') || txt(dest, 'CPF'),
    xNomeDest:txt(dest, 'xNome'),
    ufDest:   txt(dest, 'UF') || txt(doc.querySelector('enderDest'), 'UF'),
    vProd:    num(total, 'vProd'),
    vFrete:   num(total, 'vFrete'),
    vDesc:    num(total, 'vDesc'),
    vIPI:     num(total, 'vIPI'),
    vICMS:    num(total, 'vICMS'),
    vPIS:     num(total, 'vPIS'),
    vCOFINS:  num(total, 'vCOFINS'),
    vNF:      num(total, 'vNF'),
    _filename: filename,
  }
}
