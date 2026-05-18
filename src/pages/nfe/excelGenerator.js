/**
 * Porta do ExcelGenerator.js original — SpreadsheetML com fórmulas reais.
 */

function escapeXml(str) {
  if (!str) return ''
  return String(str).replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]))
}

export function generateExcel(items, nfeNumber) {
  const ts = new Date().toISOString()

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
  <Style ss:ID="sWarn"><Font ss:Color="#B91C1C"/></Style>
  <Style ss:ID="sTotal">
   <Font ss:Bold="1"/>
   <Borders><Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/></Borders>
   <NumberFormat ss:Format="Currency"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="NF-e ${escapeXml(nfeNumber || 'Itens')}">
  <Table ss:ExpandedColumnCount="10" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">
   <Column ss:Width="80"/>
   <Column ss:Width="40"/>
   <Column ss:Width="200"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="260"/>
   <Column ss:Width="100"/>
   <Column ss:Width="200"/>
   <Row ss:Height="20">
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">NCM</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">UF</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Produto</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">vProd</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">ICMS_XML</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Base de Cálculo</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Regra_Tipo</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Cálculo_Detalhado</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">ICMS_Calculado</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Observação</Data></Cell>
   </Row>`

  items.forEach(item => {
    let styleId = 'sRuleNORMAL'
    if (item.ruleType === 'ICMS-ST')      styleId = 'sRuleST'
    else if (item.ruleType === 'DIFERENCIAL') styleId = 'sRuleDIFERENCIAL'
    else if (item.ruleType === 'DIFAL')   styleId = 'sRuleDIFAL'

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

    let icmsFormula
    if (item.ruleType === 'ICMS-ST') {
      const rate = item.formulaParams.rate || 0
      icmsFormula = `=(RC[-3]*${rate}/100)-RC[-4]`
    } else if (item.ruleType === 'DIFERENCIAL') {
      const rate = item.formulaParams.rate || 0
      icmsFormula = `=(RC[-3]*${rate}/100)-RC[-4]`
    } else if (item.ruleType === 'DIFAL') {
      const rate = item.formulaParams.internalRate || 0
      icmsFormula = `=(RC[-3]*${rate}/100)-RC[-4]`
    } else {
      icmsFormula = '0'
    }

    const warn = (item.warnings || []).join('; ')

    xml += `
   <Row>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(item.NCM)}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(item.destUF)}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(item.xProd)}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${item.vProd}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${item.vICMSXml}</Data></Cell>
    <Cell ss:StyleID="sBaseCalc" ss:Formula="${baseCalcFormula}"><Data ss:Type="Number">${item.baseCalculo}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(item.ruleType)}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(item.formulaDesc)}</Data></Cell>
    <Cell ss:StyleID="${styleId}" ss:Formula="${icmsFormula}"><Data ss:Type="Number">${item.calculatedICMS}</Data></Cell>
    <Cell ss:StyleID="${warn ? 'sWarn' : styleId}"><Data ss:Type="String">${escapeXml(warn)}</Data></Cell>
   </Row>`
  })

  const n = items.length
  if (n > 0) {
    xml += `
   <Row>
    <Cell ss:Index="3" ss:StyleID="sTotal"><Data ss:Type="String">TOTAIS:</Data></Cell>
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
