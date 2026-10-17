import { locationAt, passageAround, type Passage } from './quote-locate'

export type TextHit = { location: string | null; passage: Passage }
export type TextSearchResult = { total: number; hits: TextHit[] }

export const MIN_QUERY_CHARS = 2
export const MAX_QUERY_CHARS = 100

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Escapes % _ and \ so user text is matched literally by SQL LIKE/ILIKE. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&')

/** The longest word in the query: used to narrow candidate documents cheaply in the database before the exact phrase check. */
export function anchorTerm(query: string): string {
  return query.trim().split(/\s+/).reduce((best, t) => t.length > best.length ? t : best, '')
}

/** Finds every occurrence of the query as a phrase (case-insensitive, whitespace-flexible) and returns up to `maxHits` passages with their page/slide/sheet. */
export function searchText(text: string, query: string, maxHits = 3, radius = 200): TextSearchResult {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0 || query.trim().length < MIN_QUERY_CHARS) return { total: 0, hits: [] }
  const re = new RegExp(words.map(escapeRegExp).join('\\s+'), 'gi')
  const hits: TextHit[] = []
  let total = 0
  for (const m of text.matchAll(re)) {
    total++
    if (hits.length < maxHits) {
      const start = m.index ?? 0
      hits.push({ location: locationAt(text, start), passage: passageAround(text, start, start + m[0].length, radius) })
    }
  }
  return { total, hits }
}
