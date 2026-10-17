/** Browser-side text extraction for uploaded files. Output carries location markers ([Page 3], [Slide 2], [Sheet: BOM]) so citations can point somewhere. */

export const MAX_TEXT_CHARS = 200_000
export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'pptx', 'xlsx', 'md', 'markdown', 'txt'] as const
export const ACCEPT_ATTR = '.pdf,.docx,.pptx,.xlsx,.md,.markdown,.txt'

export type ExtractResult = { text: string; truncated: boolean }

export class ExtractError extends Error {}

export function fileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function isSupported(name: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(fileExtension(name))
}

export function finalize(raw: string): ExtractResult {
  const text = raw.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return text.length > MAX_TEXT_CHARS ? { text: text.slice(0, MAX_TEXT_CHARS), truncated: true } : { text, truncated: false }
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const doc = await task.promise
  const pages: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent()
    let line = '', out = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      line += item.str
      if (item.hasEOL) { out += line + '\n'; line = '' } else if (item.str && !item.str.endsWith(' ')) line += ' '
    }
    out += line
    if (out.trim()) pages.push(`[Page ${n}]\n${out.trim()}`)
  }
  await task.destroy()
  return pages.join('\n\n')
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return value
}

const slideNumber = (path: string) => Number(/slide(\d+)\.xml$/.exec(path)?.[1] ?? 0)

/** Pulls <a:t> text runs out of each slide (and speaker notes) of a .pptx archive. */
export async function pptxToText(data: ArrayBuffer | Uint8Array): Promise<string> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(data)
  const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml')
  const paragraphs = (xml: string) =>
    Array.from(parse(xml).getElementsByTagNameNS('*', 'p'))
      .map(p => Array.from(p.getElementsByTagNameNS('*', 't')).map(t => t.textContent ?? '').join(''))
      .filter(Boolean)
  const slides = Object.keys(zip.files).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => slideNumber(a) - slideNumber(b))
  const out: string[] = []
  for (const path of slides) {
    const n = slideNumber(path)
    const body = paragraphs(await zip.files[path].async('string'))
    const notesFile = zip.files[`ppt/notesSlides/notesSlide${n}.xml`]
    const notes = notesFile ? paragraphs(await notesFile.async('string')).filter(l => !/^\d+$/.test(l)) : []
    if (body.length || notes.length) out.push(`[Slide ${n}]\n${body.join('\n')}${notes.length ? `\nNotes: ${notes.join(' ')}` : ''}`)
  }
  return out.join('\n\n')
}

type Cell = string | number | boolean | Date | null | undefined
const cellText = (c: Cell) => c == null ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c)

/** One block per sheet; each row is rendered "Header: value | Header: value" so values keep their column meaning. */
export function sheetsToText(sheets: { sheet: string; data: Cell[][] }[]): string {
  return sheets.map(({ sheet, data }) => {
    const rows = data.filter(r => r.some(c => cellText(c) !== ''))
    if (!rows.length) return ''
    const [header, ...rest] = rows
    const labels = header.map(cellText)
    const lines = rest.map(r => r.map((c, i) => cellText(c) === '' ? '' : `${labels[i] || `Col ${i + 1}`}: ${cellText(c)}`).filter(Boolean).join(' | '))
    return `[Sheet: ${sheet}]\n${labels.filter(Boolean).join(' | ')}\n${lines.filter(Boolean).join('\n')}`
  }).filter(Boolean).join('\n\n')
}

async function extractXlsx(file: File): Promise<string> {
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  return sheetsToText((await readXlsxFile(file)) as { sheet: string; data: Cell[][] }[])
}

export async function extractText(file: File): Promise<ExtractResult> {
  const ext = fileExtension(file.name)
  let raw: string
  try {
    if (ext === 'pdf') raw = await extractPdf(file)
    else if (ext === 'docx') raw = await extractDocx(file)
    else if (ext === 'pptx') raw = await pptxToText(await file.arrayBuffer())
    else if (ext === 'xlsx') raw = await extractXlsx(file)
    else if (['md', 'markdown', 'txt'].includes(ext)) raw = await file.text()
    else throw new ExtractError('Unsupported file type. Use PDF, DOCX, PPTX, XLSX, Markdown, or text files.')
  } catch (e) {
    if (e instanceof ExtractError) throw e
    throw new ExtractError(`Could not read this ${ext.toUpperCase()} file. It may be damaged or password-protected.`)
  }
  const result = finalize(raw)
  if (!result.text) throw new ExtractError(ext === 'pdf' ? 'No readable text found. This PDF may be scanned images; OCR is not supported yet.' : 'No readable text found in this file.')
  return result
}
