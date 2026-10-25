import { describe, expect, it } from 'vitest'
import { alertConfidence, confidenceLabel, staleHintText, staleSourceHint } from '@/lib/claim-confidence'
import { analysisTruncation, truncationNotices, MAX_ANALYSIS_CHARS } from '@/lib/truncation'
import { DEFAULT_GEMINI_MODEL, geminiEndpoint, geminiModel } from '@/lib/gemini-model'

const sources = [{ id: 's1', title: 'Spec.pdf', updated_at: '2026-10-01T00:00:00Z' }, { id: 's2', title: 'Deck.pptx', updated_at: '2026-10-10T00:00:00Z' }, { id: 's3', title: 'Notes.docx' }]
const cl = (source_id: string, status: string, confidence = 0.9) => ({ source_id, status, confidence })

describe('alert confidence', () => {
  it('labels by the lower claim confidence', () => {
    expect([0.95, 0.8, 0.79, 0.5, 0.49, 0].map(confidenceLabel)).toEqual(['High', 'High', 'Medium', 'Medium', 'Low', 'Low'])
    expect(alertConfidence([{ confidence: 0.95 }, { confidence: 0.4 }])).toBe('Low')
    expect(alertConfidence([{ confidence: 0.9 }])).toBe('High')
    expect(alertConfidence([])).toBeNull()
  })
})

describe('likely out-of-date hint', () => {
  it('prefers approved over proposed, preferred or unknown', () => {
    for (const other of ['proposed', 'preferred', 'unknown']) {
      const h = staleSourceHint(cl('s1', 'approved'), cl('s2', other), sources)
      expect(h).toMatchObject({ kind: 'stale', sourceId: 's2', sourceTitle: 'Deck.pptx' })
    }
  })
  it('treats superseded as stale regardless of order', () => {
    expect(staleSourceHint(cl('s1', 'superseded'), cl('s2', 'approved'), sources)).toMatchObject({ kind: 'stale', sourceId: 's1' })
    expect(staleSourceHint(cl('s2', 'proposed'), cl('s1', 'superseded'), sources)).toMatchObject({ kind: 'stale', sourceId: 's1' })
  })
  it('falls back to source recency when statuses tie', () => {
    expect(staleSourceHint(cl('s1', 'proposed'), cl('s2', 'proposed'), sources)).toMatchObject({ kind: 'stale', sourceId: 's1' })
    expect(staleSourceHint(cl('s2', 'approved'), cl('s1', 'approved'), sources)).toMatchObject({ kind: 'stale', sourceId: 's1' })
  })
  it('says it cannot tell when dates are missing, equal, or the source is shared', () => {
    expect(staleSourceHint(cl('s1', 'proposed'), cl('s3', 'proposed'), sources).kind).toBe('unknown')
    expect(staleSourceHint(cl('s1', 'proposed'), cl('s1', 'proposed'), sources).kind).toBe('unknown')
    const same = [{ id: 'a', title: 'A', updated_at: '2026-10-01T00:00:00Z' }, { id: 'b', title: 'B', updated_at: '2026-10-01T00:00:00Z' }]
    expect(staleSourceHint(cl('a', 'unknown'), cl('b', 'unknown'), same).kind).toBe('unknown')
  })
  it('uses cautious wording', () => {
    expect(staleHintText(staleSourceHint(cl('s1', 'approved'), cl('s2', 'proposed'), sources))).toBe('Likely out of date: Deck.pptx')
    expect(staleHintText({ kind: 'unknown', reason: '' })).toBe('Cannot tell which is current')
  })
})

describe('truncation notices', () => {
  it('records nothing when under the limits', () => expect(analysisTruncation(1000, 10)).toBeNull())
  it('records text and claim truncation', () => {
    expect(analysisTruncation(MAX_ANALYSIS_CHARS + 5, 41)).toEqual({ text_chars: MAX_ANALYSIS_CHARS + 5, analyzed_chars: MAX_ANALYSIS_CHARS, claims_found: 41, claims_kept: 40 })
  })
  it('turns metadata into plain notices', () => {
    const n = truncationNotices({ truncated: true, original_chars: 350000, analysis_truncation: analysisTruncation(200000, 55) })
    expect(n).toHaveLength(3)
    expect(n[0]).toContain('first 200,000 characters')
    expect(n[1]).toContain('Only the first 60,000 characters of this source were analyzed')
    expect(n[2]).toContain('first 40 of 55')
    expect(truncationNotices({})).toEqual([])
    expect(truncationNotices(null)).toEqual([])
  })
})

describe('gemini model name', () => {
  it('defaults and honours GEMINI_MODEL', () => {
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.8-flash')
    expect(geminiModel({})).toBe('gemini-3.8-flash')
    expect(geminiModel({ GEMINI_MODEL: 'other-model' })).toBe('other-model')
    expect(geminiEndpoint('x')).toBe('https://generativelanguage.googleapis.com/v1beta/models/x:generateContent')
  })
})
