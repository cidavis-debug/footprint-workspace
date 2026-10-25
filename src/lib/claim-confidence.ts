/** Alert confidence and a cautious "which side may be out of date" hint, derived only from loaded claims and sources. */

export type ConfidenceLabel = 'High' | 'Medium' | 'Low'
export type ConfClaim = { source_id: string; status: string; confidence: number }
export type ConfSource = { id: string; title: string; updated_at?: string | null }

export const confidenceLabel = (confidence: number): ConfidenceLabel => confidence >= 0.8 ? 'High' : confidence >= 0.5 ? 'Medium' : 'Low'

/** Label from the lower of the claims' confidences; null when there are no claims to judge. */
export function alertConfidence(claims: { confidence: number }[]): ConfidenceLabel | null {
  if (claims.length === 0) return null
  return confidenceLabel(Math.min(...claims.map(c => c.confidence)))
}

/** Higher is more authoritative. Approved beats proposed, preferred and unknown; superseded is stale. */
const statusRank = (status: string) => status === 'approved' ? 2 : status === 'superseded' ? 0 : 1

export type StaleHint =
  | { kind: 'stale'; sourceId: string; sourceTitle: string; reason: string }
  | { kind: 'unknown'; reason: string }

export function staleSourceHint(a: ConfClaim, b: ConfClaim, sources: ConfSource[]): StaleHint {
  const title = (id: string) => sources.find(s => s.id === id)?.title ?? 'Unknown source'
  const stale = (c: ConfClaim, reason: string): StaleHint => ({ kind: 'stale', sourceId: c.source_id, sourceTitle: title(c.source_id), reason })
  if (a.source_id === b.source_id) return { kind: 'unknown', reason: 'Both claims come from the same source.' }
  const ra = statusRank(a.status), rb = statusRank(b.status)
  if (ra !== rb) {
    const [low, high] = ra < rb ? [a, b] : [b, a]
    return stale(low, low.status === 'superseded' ? 'Its claim is marked superseded.' : `The other claim is ${high.status}; this one is ${low.status}.`)
  }
  const time = (id: string) => { const t = Date.parse(sources.find(s => s.id === id)?.updated_at ?? ''); return Number.isNaN(t) ? null : t }
  const ta = time(a.source_id), tb = time(b.source_id)
  if (ta !== null && tb !== null && ta !== tb) return stale(ta < tb ? a : b, 'Claim statuses are equal; this source was updated less recently. Last-updated time is only a rough guide.')
  return { kind: 'unknown', reason: ta === null || tb === null ? 'Claim statuses are equal and source dates are not available.' : 'Claim statuses and source dates do not distinguish them.' }
}

export const staleHintText = (h: StaleHint) => h.kind === 'stale' ? `Likely out of date: ${h.sourceTitle}` : 'Cannot tell which is current'
