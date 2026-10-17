/** Cheap, deterministic helpers that make conflict review sharper: rank which existing claims are worth comparing, and flag numeric disagreements. */

export type MatchClaim = { subject: string; attribute: string; value: string; unit: string | null; affected_systems: string[] }

const STOP = new Set(['the', 'of', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'on', 'at', 'by', 'with', 'system', 'systems', 'main', 'max', 'maximum', 'min', 'minimum', 'nominal', 'rated', 'value', 'shall', 'is', 'be'])

function tokens(s: string): Set<string> {
  const out = new Set<string>()
  for (const raw of s.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || STOP.has(raw)) continue
    out.add(raw.length > 3 && raw.endsWith('s') ? raw.slice(0, -1) : raw)
  }
  return out
}

/** Overlap coefficient: shared tokens relative to the smaller set, so "Main bus" matches "Main power bus". */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const t of a) if (b.has(t)) shared++
  return shared / Math.min(a.size, b.size)
}

// ---- quantities -------------------------------------------------------------------------------------------------

export type Quantity = { dimension: string; lo: number; hi: number }

const SI: Record<string, number> = { n: 1e-9, u: 1e-6, µ: 1e-6, m: 1e-3, '': 1, k: 1e3, M: 1e6, G: 1e9 }
const FIXED: Record<string, [string, number]> = {
  Ah: ['charge', 3600], mAh: ['charge', 3.6], 'm/s': ['speed', 1], 'km/h': ['speed', 1000 / 3600],
  '°C': ['temperature', 1], C: ['temperature', 1], degC: ['temperature', 1], 'deg C': ['temperature', 1],
  h: ['time', 3600], hr: ['time', 3600], hrs: ['time', 3600], hour: ['time', 3600], hours: ['time', 3600], min: ['time', 60],
}

function unitDimension(raw: string): { dimension: string; factor: number } | null {
  const u = raw.trim().replace(/\s+/g, ' ')
  if (!u) return null
  const fixed = FIXED[u]
  if (fixed) return { dimension: fixed[0], factor: fixed[1] }
  let m = /^([nuµmkMG]?)(V|A|W|Hz)$/.exec(u)
  if (m) return { dimension: { V: 'voltage', A: 'current', W: 'power', Hz: 'frequency' }[m[2] as 'V'], factor: SI[m[1]] }
  m = /^([kKmMgG]?)(?:bit\/s|bps|b\/s)$/.exec(u)
  if (m) return { dimension: 'data rate', factor: { '': 1, k: 1e3, K: 1e3, m: 1e6, M: 1e6, g: 1e9, G: 1e9 }[m[1]] ?? 1 }
  m = /^(k|m|)g$/.exec(u)
  if (m) return { dimension: 'mass', factor: { k: 1, '': 1e-3, m: 1e-6 }[m[1]] ?? 1 }
  m = /^(k|c|m|)m$/.exec(u)
  if (m) return { dimension: 'length', factor: { k: 1e3, c: 1e-2, m: 1e-3, '': 1 }[m[1]] ?? 1 }
  m = /^(m|u|n|)s$/.exec(u)
  if (m) return { dimension: 'time', factor: SI[m[1]] }
  return null
}

/** Reads "24 V", "-20 °C to 60 °C", or value "500" with unit "kbit/s" into a comparable range; null when it is not a plain quantity. */
export function parseQuantity(value: string, unit: string | null): Quantity | null {
  const text = `${value} ${unit ?? ''}`.replace(/[−–—]/g, '-').trim()
  const nums = [...text.matchAll(/-?\d+(?:\.\d+)?/g)]
  if (nums.length === 0 || nums.length > 2) return null
  const unitText = (unit?.trim() || text.slice((nums[nums.length - 1].index ?? 0) + nums[nums.length - 1][0].length).replace(/^\s*(?:to|-|\.\.\.)?\s*/, '')).trim().replace(/\s*(?:nominal|max|min|typ|typical)\.?$/i, '').trim()
  const dim = unitDimension(unitText)
  if (!dim) return null
  const vals = nums.map(n => Number(n[0]) * dim.factor)
  return { dimension: dim.dimension, lo: Math.min(...vals), hi: Math.max(...vals) }
}

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))

/** True when both values are quantities of the same kind and they genuinely differ (12 V vs 24 V, 500 kbit/s vs 1 Mbit/s). */
export function numericMismatch(a: MatchClaim, b: MatchClaim): string | null {
  const qa = parseQuantity(a.value, a.unit), qb = parseQuantity(b.value, b.unit)
  if (!qa || !qb || qa.dimension !== qb.dimension) return null
  if (close(qa.lo, qb.lo) && close(qa.hi, qb.hi)) return null
  const show = (c: MatchClaim) => `${c.value}${c.unit ? ` ${c.unit}` : ''}`
  return `${show(a)} vs ${show(b)}`
}

// ---- ranking ----------------------------------------------------------------------------------------------------

/** 0..1 — how likely two claims describe the same thing (subject and attribute overlap, shared systems, same kind of unit). */
export function matchScore(a: MatchClaim, b: MatchClaim): number {
  const subject = overlap(tokens(a.subject), tokens(b.subject))
  const attribute = overlap(tokens(a.attribute), tokens(b.attribute))
  const systems = overlap(tokens(a.affected_systems.join(' ')), tokens(b.affected_systems.join(' ')))
  const qa = parseQuantity(a.value, a.unit), qb = parseQuantity(b.value, b.unit)
  const sameKind = qa && qb && qa.dimension === qb.dimension ? 1 : 0
  return Math.min(1, 0.45 * subject + 0.35 * attribute + 0.1 * systems + 0.1 * sameKind)
}

/** The `limit` existing claims most related to any new claim, best first. Replaces an arbitrary "first 200" cut-off. */
export function rankCandidates<T extends MatchClaim>(fresh: MatchClaim[], existing: T[], limit: number): T[] {
  if (existing.length <= limit) return existing
  return existing
    .map((e, i) => ({ e, i, score: Math.max(0, ...fresh.map(n => matchScore(n, e))) }))
    .sort((x, y) => y.score - x.score || x.i - y.i)
    .slice(0, limit)
    .map(x => x.e)
}

export type ConflictHint<T> = { newIndex: number; related: T; detail: string }

/** Pairs that look like the same quantity with different numbers. Passed to the model as leads to verify, never saved as alerts directly. */
export function conflictHints<T extends MatchClaim>(fresh: MatchClaim[], existing: T[]): ConflictHint<T>[] {
  const hints: ConflictHint<T>[] = []
  fresh.forEach((n, newIndex) => {
    for (const e of existing) {
      if (overlap(tokens(n.subject), tokens(e.subject)) < 0.5 || overlap(tokens(n.attribute), tokens(e.attribute)) < 0.5) continue
      const detail = numericMismatch(n, e)
      if (detail) hints.push({ newIndex, related: e, detail })
    }
  })
  return hints
}
