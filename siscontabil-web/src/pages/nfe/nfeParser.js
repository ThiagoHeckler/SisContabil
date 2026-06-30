/**
 * Porta fiel do NFeXmlParser.js original.
 * Regras fiscais para PA e GO por NCM.
 */

const TAX_RULES_DB = {
  "19059090": { "PA": { type: "ICMS-ST", mva: 40, rate: 19, desc: "Casquinha" }, "GO": { type: "NORMAL" } },
  "19053100": { "PA": { type: "ICMS-ST", mva: 40, rate: 19, desc: "Biscoitos e bolachas" }, "GO": { type: "NORMAL" } },
  "19053200": { "PA": { type: "ICMS-ST", mva: 40, rate: 19, desc: "Waffles e wafers" }, "GO": { type: "NORMAL" } },
  "19019090": { "PA": { type: "ICMS-ST", mva: 30.37, rate: 19, desc: "Misturas bolos" }, "GO": { type: "NORMAL" } },
  "04029900": { "PA": { type: "ICMS-ST", mva: 30.37, rate: 19, desc: "Leite cond" }, "GO": { type: "NORMAL" } },
  "18069000": { "PA": { type: "ICMS-ST", mva: 30.37, rate: 19, desc: "Achocolatados / Confeitos" }, "GO": { type: "NORMAL" } },
  "04022110": { "PA": { type: "ICMS-ST", mva: 30.37, rate: 19, desc: "Leite em pó" }, "GO": { type: "NORMAL" } },
  "21011000": { "PA": { type: "ICMS-ST", mva: 30.37, rate: 19, desc: "Extratos de café" }, "GO": { type: "NORMAL" } },
  "19011020": { "PA": { type: "ICMS-ST", mva: 30.37, rate: 19, desc: "Farinha lactea" }, "GO": { type: "NORMAL" } },
  "04012010": { "PA": { type: "ICMS-ST", mva: 30.37, rate: 19, desc: "LEITE LONGA" } },
  "17049020": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "NORMAL" } },
  "17041000": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "NORMAL" } },
  "20079990": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "NORMAL" } },
  "04049000": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "NORMAL" } },
  "20089900": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "NORMAL" } },
  "20086010": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "NORMAL" } },
  "48183000": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "DIFAL", internalRate: 19, divisor: 0.81 } },
  "04040000": { "PA": { type: "DIFERENCIAL", rate: 19, desc: "Prep/ Sorvete" }, "GO": { type: "NORMAL" } },
  "48119090": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "DIFAL", internalRate: 19, divisor: 0.81 } },
  "18062000": { "PA": { type: "DIFERENCIAL", rate: 19, desc: "Prep/ Sorvete" } },
  "39241000": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "DIFAL", internalRate: 19, divisor: 0.81 } },
  "39235000": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "DIFAL", internalRate: 19, divisor: 0.81 } },
  "21069090": { "PA": { type: "DIFERENCIAL", rate: 19, desc: "Prep/ Sorvete" }, "GO": { type: "NORMAL" } },
  "20081100": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "NORMAL" } },
  "18063220": { "PA": { type: "DIFERENCIAL", rate: 19, desc: "Prep/ Sorvete" }, "GO": { type: "NORMAL" } },
  "19041000": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "NORMAL" } },
  "17040000": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "NORMAL" } },
  "20070000": { "PA": { type: "DIFERENCIAL", rate: 19 } },
  "39249000": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "DIFAL", internalRate: 19, divisor: 0.81 } },
  "39172900": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "DIFAL", internalRate: 19, divisor: 0.81 } },
  "39231090": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "DIFAL", internalRate: 19, divisor: 0.81 } },
  "39232190": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "DIFAL", internalRate: 19, divisor: 0.81 } },
  "20080000": { "PA": { type: "DIFERENCIAL", rate: 19 } },
  "48180000": { "PA": { type: "DIFERENCIAL", rate: 19 } },
  "17010000": { "PA": { type: "DIFERENCIAL", rate: 19, desc: "AÇUCARES" } },
  "21069029": { "PA": { type: "DIFERENCIAL", rate: 19, desc: "Prep/ Sorvete" }, "GO": { type: "NORMAL" } },
  "17019100": { "PA": { type: "DIFERENCIAL", rate: 19 }, "GO": { type: "NORMAL" } },
}

function getNodeValue(parent, selector) {
  try {
    const node = parent.querySelector(selector)
    return node ? node.textContent : ''
  } catch {
    return ''
  }
}

function applyFiscalRules(ncm, uf, vProd, vICMSXml, pMVASTXml = 0) {
  let ruleType = 'NORMAL'
  let calculatedICMS = 0
  let baseCalculo = vProd
  const warnings = []
  let formulaParams = {}
  let formulaDesc = '0'

  const cleanNCM = (ncm || '').trim()
  const cleanUF  = (uf  || '').trim().toUpperCase()

  const ncmRules = TAX_RULES_DB[cleanNCM]

  if (!ncmRules) {
    warnings.push(`NCM ${cleanNCM} não encontrado na base de regras.`)
    formulaDesc = '0 (NCM não encontrado)'
  } else {
    const rule = ncmRules[cleanUF]
    if (!rule) {
      warnings.push(`Regra existe para NCM ${cleanNCM} mas não para UF ${cleanUF}.`)
      formulaDesc = '0 (UF sem regra)'
    } else {
      ruleType = rule.type
      const mvaToUse = rule.mva !== undefined ? rule.mva : pMVASTXml
      formulaParams = { ...rule, usedMva: mvaToUse }

      if (ruleType === 'ICMS-ST') {
        baseCalculo = vProd * (1 + mvaToUse / 100)
        calculatedICMS = (baseCalculo * rule.rate / 100) - vICMSXml
        formulaDesc = `((vProd × (1 + ${mvaToUse}%)) × ${rule.rate}%) − ICMS_XML`
      } else if (ruleType === 'DIFERENCIAL') {
        baseCalculo = vProd
        calculatedICMS = (baseCalculo * rule.rate / 100) - vICMSXml
        formulaDesc = `(vProd × ${rule.rate}%) − ICMS_XML`
      } else if (ruleType === 'DIFAL') {
        const divisor = rule.divisor || 0.81
        baseCalculo = (vProd - vICMSXml) / divisor
        calculatedICMS = (baseCalculo * rule.internalRate / 100) - vICMSXml
        formulaDesc = `((vProd − ICMS) ÷ ${divisor}) × ${rule.internalRate}% − ICMS`
      } else {
        baseCalculo = vProd
        calculatedICMS = 0
        formulaDesc = '0'
      }
    }
  }

  if (calculatedICMS < 0) calculatedICMS = 0
  if (baseCalculo < 0)    baseCalculo = 0

  return { ruleType, calculatedICMS, baseCalculo, warnings, formulaParams, formulaDesc }
}

export function parseNfe(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  if (doc.querySelector('parsererror'))
    throw new Error('XML inválido ou corrompido.')

  const nfeNumber = getNodeValue(doc, 'nNF')
  const destUF    = getNodeValue(doc, 'dest > enderDest > UF') ||
                    getNodeValue(doc, 'enderDest > UF')

  const detNodes = doc.querySelectorAll('det')
  const items = []

  detNodes.forEach(node => {
    const prod    = node.querySelector('prod')
    const imposto = node.querySelector('imposto')
    if (!prod) return

    const NCM   = getNodeValue(prod, 'NCM').trim()
    const vProd = parseFloat(getNodeValue(prod, 'vProd') || '0')

    let vICMSXml = 0
    let pMVASTXml = 0
    let vICMSSTXml = 0

    const icmsGroups = [
      'ICMS00','ICMS10','ICMS20','ICMS30','ICMS40','ICMS51',
      'ICMS60','ICMS70','ICMS90','ICMSSN101','ICMSSN102',
      'ICMSSN201','ICMSSN202','ICMSSN500','ICMSSN900','ICMSST',
    ]

    if (imposto) {
      for (const group of icmsGroups) {
        const g = imposto.querySelector(`ICMS > ${group}`)
        if (g) {
          const v = getNodeValue(g, 'vICMS')
          if (v) vICMSXml = parseFloat(v)
          const m = getNodeValue(g, 'pMVAST')
          if (m) pMVASTXml = parseFloat(m)
          const st = getNodeValue(g, 'vICMSST')
          if (st) vICMSSTXml = parseFloat(st)
          break
        }
      }
    }

    const itemData = {
      nItem: node.getAttribute('nItem'),
      xProd: getNodeValue(prod, 'xProd'),
      NCM, vProd, vICMSXml, pMVASTXml, vICMSSTXml,
    }

    // Produto com ICMS-ST já destacado/pago na nota: não calcula nada.
    const ruleResult = vICMSSTXml > 0
      ? {
          ruleType:       'ICMS-ST-PAGO',
          calculatedICMS: 0,
          baseCalculo:    0,
          warnings:       [],
          formulaParams:  {},
          formulaDesc:    'ICMS-ST destacado/pago na nota — sem cálculo',
        }
      : applyFiscalRules(NCM, destUF, vProd, vICMSXml, pMVASTXml)

    items.push({ ...itemData, ...ruleResult, destUF })
  })

  return { nfeNumber, destUF, items }
}
