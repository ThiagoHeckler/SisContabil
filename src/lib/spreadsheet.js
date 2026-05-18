/**
 * Gerador SpreadsheetML simples para exportações no SisContabil.
 * Sem dependências externas — mesmo padrão do excelGenerator.js do NFeConverter.
 */

function escapeXml(str) {
  if (str == null) return ''
  return String(str).replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]))
}

/**
 * @param {string[]} headers - Cabeçalhos das colunas
 * @param {Array<string[]>} rows - Linhas de dados (array de arrays)
 * @param {string} sheetName - Nome da aba
 * @returns {string} XML SpreadsheetML
 */
export function buildSpreadsheetML(headers, rows, sheetName = 'Planilha') {
  const ts = new Date().toISOString()
  const numCols = headers.length

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>SisContabil</Author><Created>${ts}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="sH">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1a7a4a" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="sD"><Font ss:FontName="Calibri" ss:Size="11"/></Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table ss:ExpandedColumnCount="${numCols}" x:FullColumns="1" x:FullRows="1">
   <Row ss:Height="20">`

  headers.forEach(h => {
    xml += `<Cell ss:StyleID="sH"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
  })

  xml += `</Row>`

  rows.forEach(row => {
    xml += `<Row>`
    row.forEach(cell => {
      xml += `<Cell ss:StyleID="sD"><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`
    })
    xml += `</Row>`
  })

  xml += `</Table></Worksheet></Workbook>`
  return xml
}

export function downloadXls(headers, rows, filename, sheetName) {
  const xml  = buildSpreadsheetML(headers, rows, sheetName)
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
