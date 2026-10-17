/** Compares a source's engineering claims before and after its content changed. */

export type DiffClaim = { type: string; subject: string; attribute: string; value: string; unit: string | null; status: string }
export type ClaimChange = { before: DiffClaim; after: DiffClaim }
export type AlertRef = { title: string; severity: string }
export type SourceDiff = {
  added: DiffClaim[]
  removed: DiffClaim[]
  changed: ClaimChange[]
  unchanged: number
  alerts_raised: AlertRef[]
  alerts_cleared: AlertRef[]
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const valueKey = (c: DiffClaim) => norm(`${c.value} ${c.unit ?? ''}`).replace(/\s/g, '')
const identity = (c: DiffClaim) => `${c.type}|${norm(c.subject)}|${norm(c.attribute)}`
const slim = (c: DiffClaim): DiffClaim => ({ type: c.type, subject: c.subject, attribute: c.attribute, value: c.value, unit: c.unit ?? null, status: c.status })

/**
 * Matches claims by type + subject + attribute. Leftovers are matched when exactly one old and one new claim share the same attribute
 * (the model sometimes renames a subject, e.g. "Main bus" vs "Main power bus"). A claim is "changed" when its value, unit, or status differs.
 */
export function diffClaims(before: DiffClaim[], after: DiffClaim[]): Pick<SourceDiff, 'added' | 'removed' | 'changed' | 'unchanged'> {
  const oldLeft = before.map(slim), newLeft = after.map(slim)
  const pairs: [DiffClaim, DiffClaim][] = []
  const take = (list: DiffClaim[], c: DiffClaim) => list.splice(list.indexOf(c), 1)

  for (const o of [...oldLeft]) {
    const n = newLeft.find(x => identity(x) === identity(o))
    if (n) { pairs.push([o, n]); take(oldLeft, o); take(newLeft, n) }
  }
  const byAttribute = (list: DiffClaim[], c: DiffClaim) => list.filter(x => x.type === c.type && norm(x.attribute) === norm(c.attribute))
  for (const o of [...oldLeft]) {
    const olds = byAttribute(oldLeft, o), news = byAttribute(newLeft, o)
    if (olds.length === 1 && news.length === 1) { pairs.push([o, news[0]]); take(oldLeft, o); take(newLeft, news[0]) }
  }

  const changed: ClaimChange[] = [], same: number[] = []
  for (const [o, n] of pairs) {
    if (valueKey(o) !== valueKey(n) || o.status !== n.status) changed.push({ before: o, after: n })
    else same.push(1)
  }
  return { added: newLeft, removed: oldLeft, changed, unchanged: same.length }
}

export const claimLabel = (c: DiffClaim) => `${c.subject} — ${c.attribute}`
export const claimValue = (c: DiffClaim) => `${c.value}${c.unit ? ` ${c.unit}` : ''}`

export function diffIsEmpty(d: Pick<SourceDiff, 'added' | 'removed' | 'changed'>) {
  return d.added.length + d.removed.length + d.changed.length === 0
}

/** One-line summary, e.g. "2 values changed, 1 added, 1 removed". */
export function diffSummary(d: SourceDiff): string {
  const parts = [
    d.changed.length ? `${d.changed.length} value${d.changed.length === 1 ? '' : 's'} changed` : '',
    d.added.length ? `${d.added.length} added` : '',
    d.removed.length ? `${d.removed.length} removed` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : 'no engineering claims changed'
}

export type SourceChangeRow = { id: string; source_id: string | null; source_title: string; version_from: number; version_to: number; created_at: string; diff: SourceDiff }

/** Tolerant reader for the stored jsonb (older or hand-edited rows may be missing fields). */
export function readDiff(raw: unknown): SourceDiff {
  const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const arr = <T,>(v: unknown): T[] => Array.isArray(v) ? v as T[] : []
  return { added: arr(o['added']), removed: arr(o['removed']), changed: arr(o['changed']), unchanged: typeof o['unchanged'] === 'number' ? o['unchanged'] : 0, alerts_raised: arr(o['alerts_raised']), alerts_cleared: arr(o['alerts_cleared']) }
}
