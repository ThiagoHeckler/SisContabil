/**
 * SpreadsheetML com fórmulas reais — layout alinhado com planilha de referência.
 * Colunas: NUMERO | NCM | UF | Produto | vProd | ICMS_XML | Base de Cálculo | Regra_Tipo | ICMS_Calculado
 */

function escapeXml(str) {
  if (!str) return ''
  return String(str).replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]))
}

// Para GO: DIFERENCIAL vira DIFAL, ICMS-ST vira NORMAL
function displayRule(ruleType, destUF) {
  if (ruleType === 'ICMS-ST-PAGO') return 'ICMS ST PAGO'   // prioridade — independe da UF
  if (destUF === 'GO') {
    if (ruleType === 'DIFERENCIAL') return 'DIFAL'
    if (ruleType === 'ICMS-ST')     return 'NORMAL'
  }
  return ruleType
}

function styleForRule(ruleType, destUF) {
  if (ruleType === 'ICMS-ST-PAGO') return 'sRuleSTPago'
  const display = displayRule(ruleType, destUF)
  if (display === 'ICMS-ST')     return 'sRuleST'
  if (display === 'DIFERENCIAL') return 'sRuleDIFERENCIAL'
  if (display === 'DIFAL')       return 'sRuleDIFAL'
  return 'sRuleNORMAL'
}

export function generateExcel(items, nfeNumber, destUF) {
  const ts = new Date().toISOString()

  // Layout das 9 colunas:
  // 1=NUMERO  2=NCM  3=UF  4=Produto  5=vProd  6=ICMS_XML  7=Base_Calc  8=Regra_Tipo  9=ICMS_Calculado
  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>SisContabil</Author>
  <Created>${ts}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Font ss:FontName="Calibri" ss:Size="11"/>
   <Alignment ss:Vertical="Bottom"/>
  </Style>
  <Style ss:ID="sHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1a7a4a" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="sNum">
   <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>
  </Style>
  <Style ss:ID="sCurrency"><NumberFormat ss:Format="Currency"/></Style>
  <Style ss:ID="sBaseCalc">
   <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="Currency"/>
  </Style>
  <Style ss:ID="sRuleST">
   <Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="Currency"/>
  </Style>
  <Style ss:ID="sRuleDIFERENCIAL">
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="Currency"/>
  </Style>
  <Style ss:ID="sRuleDIFAL">
   <Interior ss:Color="#FFEDD5" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="Currency"/>
  </Style>
  <Style ss:ID="sRuleNORMAL">
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="Currency"/>
  </Style>
  <Style ss:ID="sRuleSTPago">
   <Font ss:Color="#6B21A8" ss:Bold="1"/>
   <Interior ss:Color="#EDE9FE" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="Currency"/>
  </Style>
  <Style ss:ID="sTotal">
   <Font ss:Bold="1"/>
   <Borders><Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/></Borders>
   <NumberFormat ss:Format="Currency"/>
  </Style>
  <Style ss:ID="sTotalLabel">
   <Font ss:Bold="1"/>
   <Borders><Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/></Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="NF-e ${escapeXml(nfeNumber || 'Itens')}">
  <Table ss:ExpandedColumnCount="9" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">
   <Column ss:Width="45"/>
   <Column ss:Width="80"/>
   <Column ss:Width="35"/>
   <Column ss:Width="210"/>
   <Column ss:Width="95"/>
   <Column ss:Width="95"/>
   <Column ss:Width="105"/>
   <Column ss:Width="105"/>
   <Column ss:Width="105"/>
   <Row ss:Height="20">
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">NUMERO</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">NCM</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">UF</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Produto</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">vProd</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">ICMS_XML</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Base de Cálculo</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Regra_Tipo</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">ICMS_Calculado</Data></Cell>
   </Row>`

  items.forEach((item, idx) => {
    const styleId = styleForRule(item.ruleType, destUF)
    const label   = displayRule(item.ruleType, destUF)
    const stPago  = item.ruleType === 'ICMS-ST-PAGO'

    // Base de Cálculo — coluna 7, offsets relativos:
    //   RC[-2] = col 5 = vProd
    //   RC[-1] = col 6 = ICMS_XML
    let baseCalcFormula
    if (item.ruleType === 'ICMS-ST') {
      const mva = item.formulaParams.usedMva || 0
      baseCalcFormula = `=RC[-2]*(1+${mva}/100)`
    } else if (item.ruleType === 'DIFAL') {
      const div = item.formulaParams.divisor || 0.81
      baseCalcFormula = `=(RC[-2]-RC[-1])/${div}`
    } else {
      baseCalcFormula = `=RC[-2]`
    }

    // ICMS_Calculado — coluna 9, offsets relativos:
    //   RC[-2] = col 7 = Base de Cálculo
    //   RC[-3] = col 6 = ICMS_XML
    let icmsFormula
    if (item.ruleType === 'ICMS-ST') {
      const rate = item.formulaParams.rate || 0
      icmsFormula = `=(RC[-2]*${rate}/100)-RC[-3]`
    } else if (item.ruleType === 'DIFERENCIAL') {
      const rate = item.formulaParams.rate || 0
      icmsFormula = `=(RC[-2]*${rate}/100)-RC[-3]`
    } else if (item.ruleType === 'DIFAL') {
      const rate = item.formulaParams.internalRate || 0
      icmsFormula = `=(RC[-2]*${rate}/100)-RC[-3]`
    } else {
      icmsFormula = '0'
    }

    // ICMS-ST já pago: sem fórmula, Base e ICMS fixos em 0.
    const baseCalcCell = stPago
      ? `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">0</Data></Cell>`
      : `<Cell ss:StyleID="sBaseCalc" ss:Formula="${baseCalcFormula}"><Data ss:Type="Number">${item.baseCalculo}</Data></Cell>`
    const icmsCell = stPago
      ? `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">0</Data></Cell>`
      : `<Cell ss:StyleID="${styleId}" ss:Formula="${icmsFormula}"><Data ss:Type="Number">${item.calculatedICMS}</Data></Cell>`

    xml += `
   <Row>
    <Cell ss:StyleID="sNum"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(item.NCM)}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(item.destUF)}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(item.xProd)}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${item.vProd}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${item.vICMSXml}</Data></Cell>
    ${baseCalcCell}
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(label)}</Data></Cell>
    ${icmsCell}
   </Row>`
  })

  // Linha de totais: TOTAIS na col 4 (Produto), SUM nas cols 5, 6, 7, pula 8, SUM col 9
  const n = items.length
  if (n > 0) {
    xml += `
   <Row>
    <Cell ss:Index="4" ss:StyleID="sTotalLabel"><Data ss:Type="String">TOTAIS:</Data></Cell>
    <Cell ss:StyleID="sTotal" ss:Formula="=SUM(R[-${n}]C:R[-1]C)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="sTotal" ss:Formula="=SUM(R[-${n}]C:R[-1]C)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="sTotal" ss:Formula="=SUM(R[-${n}]C:R[-1]C)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:Index="9" ss:StyleID="sTotal" ss:Formula="=SUM(R[-${n}]C:R[-1]C)"><Data ss:Type="Number">0</Data></Cell>
   </Row>`
  }

  xml += `
  </Table>
 </Worksheet>
</Workbook>`

  return xml
}
