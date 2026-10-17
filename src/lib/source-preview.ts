/** Helpers for the source preview panel: split extracted text at its page/slide/sheet markers, and highlight a search phrase. */

export type PreviewSection = { label: string | null; text: string }
export type HighlightPart = { text: string; hit: boolean }

const MARKER_LINE = /^\[(Page \d+|Slide \d+|Sheet: [^\]\n]+)\][ \t]*$/gm
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const labelFor = (raw: string) => raw.startsWith('Sheet: ') ? `Sheet "${raw.slice(7).trim()}"` : raw

/** Text before the first marker (if any) comes first with a null label; every marker then starts a labelled section. */
export function splitSections(text: string): PreviewSection[] {
  const sections: PreviewSection[] = []
  let label: string | null = null
  let last = 0
  const push = (end: number) => { const body = text.slice(last, end).trim(); if (body || label) sections.push({ label, text: body }) }
  for (const m of text.matchAll(MARKER_LINE)) {
    push(m.index ?? 0)
    label = labelFor(m[1])
    last = (m.index ?? 0) + m[0].length
  }
  push(text.length)
  return sections.filter(s => s.text || s.label)
}

/** The phrase as a case-insensitive, whitespace-flexible pattern; null for queries that are too short to search. */
export function phrasePattern(query: string): RegExp | null {
  const words = query.trim().split(/\s+/).filter(Boolean)
  return words.length === 0 || query.trim().length < 2 ? null : new RegExp(words.map(escapeRegExp).join('\\s+'), 'gi')
}

export function highlightParts(text: string, query: string): HighlightPart[] {
  const re = phrasePattern(query)
  if (!re) return [{ text, hit: false }]
  const parts: HighlightPart[] = []
  let at = 0
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0
    if (start > at) parts.push({ text: text.slice(at, start), hit: false })
    parts.push({ text: m[0], hit: true })
    at = start + m[0].length
  }
  if (at < text.length) parts.push({ text: text.slice(at), hit: false })
  return parts.length ? parts : [{ text, hit: false }]
}

export function countMatches(sections: PreviewSection[], query: string): number {
  const re = phrasePattern(query)
  return re ? sections.reduce((n, s) => n + (s.text.match(re)?.length ?? 0), 0) : 0
}
