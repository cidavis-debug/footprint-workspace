/** Limits applied while analysing long sources, and the plain-language notices that make them visible. No chunking: only the start of a long source is analysed. */

export const MAX_ANALYSIS_CHARS = 60_000
export const MAX_ANALYSIS_CLAIMS = 40

/** Stored in sources.metadata.analysis_truncation (existing JSON field; no schema change). */
export type AnalysisTruncation = { text_chars: number; analyzed_chars: number; claims_found: number; claims_kept: number }

/** Null when nothing was cut. */
export function analysisTruncation(textChars: number, claimsFound: number): AnalysisTruncation | null {
  const analyzed = Math.min(textChars, MAX_ANALYSIS_CHARS)
  const kept = Math.min(claimsFound, MAX_ANALYSIS_CLAIMS)
  return analyzed < textChars || kept < claimsFound ? { text_chars: textChars, analyzed_chars: analyzed, claims_found: claimsFound, claims_kept: kept } : null
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null
const fmt = (n: number) => n.toLocaleString('en-US')

/** Notices for one source from its metadata JSON: extraction cap and analysis cap. Empty when nothing was cut. */
export function truncationNotices(metadata: unknown): string[] {
  const m = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {}
  const out: string[] = []
  if (m['truncated'] === true) {
    const original = num(m['original_chars'])
    out.push(`Only the first ${fmt(200_000)} characters of this file were extracted${original ? ` (it has about ${fmt(original)})` : ''}; the rest is not searchable or analyzed.`)
  }
  const t = m['analysis_truncation']
  if (t && typeof t === 'object') {
    const r = t as Record<string, unknown>
    const text = num(r['text_chars']), analyzed = num(r['analyzed_chars']), found = num(r['claims_found']), kept = num(r['claims_kept'])
    if (text !== null && analyzed !== null && analyzed < text) out.push(`Only the first ${fmt(analyzed)} characters of this source were analyzed (of ${fmt(text)}); later content may hold claims that were not checked.`)
    if (found !== null && kept !== null && kept < found) out.push(`Only the first ${fmt(kept)} of ${fmt(found)} extracted claims were kept.`)
  }
  return out
}
