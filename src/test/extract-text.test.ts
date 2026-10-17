import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { finalize, isSupported, MAX_TEXT_CHARS, pptxToText, sheetsToText } from '@/lib/extract-text'
import { engineeringPrompt, type EngineeringSource } from '@/lib/engineering-data'

const slideXml = (...lines: string[]) =>
  `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${lines.map(l => `<p:sp><p:txBody><a:p><a:r><a:t>${l}</a:t></a:r></a:p></p:txBody></p:sp>`).join('')}</p:spTree></p:cSld></p:sld>`

describe('extract-text', () => {
  it('recognises supported file types', () => {
    for (const n of ['a.PDF', 'b.docx', 'c.pptx', 'd.xlsx', 'e.md', 'f.txt']) expect(isSupported(n)).toBe(true)
    for (const n of ['a.doc', 'b.xls', 'c.ppt', 'd.step']) expect(isSupported(n)).toBe(false)
  })

  it('normalises whitespace and caps very long text', () => {
    expect(finalize('a\r\n\r\n\r\n\r\nb  \n').text).toBe('a\n\nb')
    const long = finalize('x'.repeat(MAX_TEXT_CHARS + 10))
    expect(long.truncated).toBe(true)
    expect(long.text).toHaveLength(MAX_TEXT_CHARS)
  })

  it('extracts slide text in order, with notes', async () => {
    const zip = new JSZip()
    zip.file('ppt/slides/slide2.xml', slideXml('Power budget', 'Main rail 24 V'))
    zip.file('ppt/slides/slide1.xml', slideXml('Motor controller review'))
    zip.file('ppt/notesSlides/notesSlide2.xml', slideXml('Confirm with supplier'))
    const text = await pptxToText(await zip.generateAsync({ type: 'uint8array' }))
    expect(text).toBe('[Slide 1]\nMotor controller review\n\n[Slide 2]\nPower budget\nMain rail 24 V\nNotes: Confirm with supplier')
  })

  it('renders spreadsheet rows with their column headers', () => {
    const text = sheetsToText([{ sheet: 'BOM', data: [['Part', 'Voltage (V)', 'Qty'], ['Motor', 12, 2], [null, null, null], ['Sensor', 5, null]] }])
    expect(text).toBe('[Sheet: BOM]\nPart | Voltage (V) | Qty\nPart: Motor | Voltage (V): 12 | Qty: 2\nPart: Sensor | Voltage (V): 5')
  })

  it('prompt uses full extracted text and truncates oversized sources', () => {
    const src = (id: string, text: string): EngineeringSource => ({ id, title: id, status: 'ready', source_type: 'file', url: null, file_path: null, content_snippet: 'preview', content_text: text, engineering_analysis_status: 'complete', engineering_summary: null })
    const prompt = engineeringPrompt([src('a', 'full text beyond preview'), src('b', 'y'.repeat(100_000))], [], [], 'q')
    expect(prompt).toContain('full text beyond preview')
    expect(prompt).not.toContain('"preview"')
    expect(prompt).toContain('[text truncated]')
  })
})
