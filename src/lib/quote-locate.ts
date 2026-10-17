/** Finds a quoted passage inside extracted source text and says where it is (page, slide, or sheet) using the markers added at extraction time. */

const MARKER = /\[(Page \d+|Slide \d+|Sheet: [^\]\n]+)\]/g

export type Passage = { before: string; match: string; after: string }
export type QuoteLocation = { location: string | null; passage: Passage }

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Exact match first, then a match that ignores differences in whitespace and case (models often re-wrap quotes). */
export function findQuote(text: string, quote: string): { start: number; end: number } | null {
  const q = quote.trim()
  if (q.length < 3) return null
  const exact = text.indexOf(q)
  if (exact >= 0) return { start: exact, end: exact + q.length }
  const pattern = q.split(/\s+/).map(escapeRegExp).join('\\s+')
  const m = new RegExp(pattern, 'i').exec(text)
  return m ? { start: m.index, end: m.index + m[0].length } : null
}

/** "Page 2", "Slide 3", or `Sheet "BOM"` for the last marker at or before `index`; null when the text has no markers before it. */
export function locationAt(text: string, index: number): string | null {
  let label: string | null = null
  for (const m of text.matchAll(MARKER)) {
    if ((m.index ?? 0) > index) break
    const raw = m[1]
    label = raw.startsWith('Sheet: ') ? `Sheet "${raw.slice(7).trim()}"` : raw
  }
  return label
}

/** The matched text with surrounding context, trimmed to whole words. */
export function passageAround(text: string, start: number, end: number, radius = 350): Passage {
  let s = Math.max(0, start - radius), e = Math.min(text.length, end + radius)
  if (s > 0) { const gap = text.slice(s, start).search(/\s/); if (gap >= 0 && gap < 60) s += gap + 1 }
  if (e < text.length) { const tail = text.slice(end, e), gap = tail.search(/\s\S*$/); if (gap > 0) e = end + gap }
  return { before: (s > 0 ? '…' : '') + text.slice(s, start), match: text.slice(start, end), after: text.slice(end, e) + (e < text.length ? '…' : '') }
}

export function locateQuote(text: string | null | undefined, quote: string): QuoteLocation | null {
  if (!text) return null
  const hit = findQuote(text, quote)
  return hit ? { location: locationAt(text, hit.start), passage: passageAround(text, hit.start, hit.end) } : null
}
