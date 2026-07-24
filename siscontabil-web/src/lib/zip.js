/**
 * Gerador de arquivo ZIP mínimo (método "store", sem compressão) — sem
 * dependências externas, no mesmo espírito do SpreadsheetML usado no resto
 * do app. Preserva os bytes originais de cada arquivo (não reencoda).
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF]
const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]

/**
 * @param {{name: string, bytes: Uint8Array}[]} files
 * @returns {Blob} application/zip
 */
export function createZip(files) {
  const enc     = new TextEncoder()
  const partes  = []   // dados (headers locais + conteúdo)
  const central = []   // diretório central
  let offset = 0

  for (const f of files) {
    const nome = enc.encode(f.name)
    const data = f.bytes
    const crc  = crc32(data)
    const size = data.length

    const local = [
      ...u32(0x04034b50), // assinatura local file header
      ...u16(20),         // versão necessária
      ...u16(0x0800),     // flag: nome em UTF-8
      ...u16(0),          // método: store
      ...u16(0), ...u16(0x21), // hora 00:00, data 1980-01-01 (válida)
      ...u32(crc),
      ...u32(size),       // tamanho comprimido
      ...u32(size),       // tamanho original
      ...u16(nome.length),
      ...u16(0),          // extra
    ]
    const localHeader = new Uint8Array(local.length + nome.length)
    localHeader.set(local, 0)
    localHeader.set(nome, local.length)

    partes.push(localHeader, data)

    const cen = [
      ...u32(0x02014b50), // assinatura central directory
      ...u16(20),         // versão que criou
      ...u16(20),         // versão necessária
      ...u16(0x0800),     // flag UTF-8
      ...u16(0),          // método
      ...u16(0), ...u16(0x21), // hora/data (1980-01-01)
      ...u32(crc),
      ...u32(size), ...u32(size),
      ...u16(nome.length),
      ...u16(0), ...u16(0), // extra, comentário
      ...u16(0),          // disco inicial
      ...u16(0),          // atributos internos
      ...u32(0),          // atributos externos
      ...u32(offset),     // deslocamento do header local
    ]
    const centralEntry = new Uint8Array(cen.length + nome.length)
    centralEntry.set(cen, 0)
    centralEntry.set(nome, cen.length)
    central.push(centralEntry)

    offset += localHeader.length + data.length
  }

  const centralStart = offset
  const centralSize  = central.reduce((s, c) => s + c.length, 0)

  const end = new Uint8Array([
    ...u32(0x06054b50), // assinatura end of central directory
    ...u16(0), ...u16(0),
    ...u16(files.length), ...u16(files.length),
    ...u32(centralSize),
    ...u32(centralStart),
    ...u16(0),          // comentário
  ])

  return new Blob([...partes, ...central, end], { type: 'application/zip' })
}
