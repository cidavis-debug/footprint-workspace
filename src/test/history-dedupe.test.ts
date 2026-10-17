import { Blob as NodeBlob } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { historyDate, pairMessages } from '@/lib/conversation-history'
import { classifyUpload, sha256Hex, storedVersion } from '@/lib/upload-dedupe'

const cite = { id: 's1', title: 'Spec.pdf', kind: 'file', url: null, quote: '24 V' }

describe('pairMessages', () => {
  it('pairs questions with answers in order, even when a pair shares a timestamp and arrives answer-first', () => {
    const turns = pairMessages([
      { role: 'assistant', content: 'A1', citations: [cite], created_at: '2026-10-16T10:00:00Z' },
      { role: 'user', content: 'Q1', citations: [], created_at: '2026-10-16T10:00:00Z' },
      { role: 'user', content: 'Q2', citations: [], created_at: '2026-10-16T10:05:00Z' },
      { role: 'assistant', content: 'A2', citations: [], created_at: '2026-10-16T10:05:00Z' },
    ])
    expect(turns.map(t => [t.question, t.answer])).toEqual([['Q1', 'A1'], ['Q2', 'A2']])
    expect(turns[0].citations).toEqual([cite])
    expect(turns.every(t => !t.pending)).toBe(true)
  })
  it('drops malformed citations and unanswered questions', () => {
    const turns = pairMessages([
      { role: 'user', content: 'Q1', citations: [], created_at: '1' },
      { role: 'assistant', content: 'A1', citations: [{ nope: true }, cite, 'x'], created_at: '1' },
      { role: 'user', content: 'Q2', citations: [], created_at: '2' },
    ])
    expect(turns).toHaveLength(1)
    expect(turns[0].citations).toEqual([cite])
  })
})

describe('historyDate', () => {
  it('labels today and yesterday', () => {
    const now = new Date(2026, 9, 16, 15, 0)
    expect(historyDate(new Date(2026, 9, 16, 9, 0).toISOString(), now)).toBe('Today')
    expect(historyDate(new Date(2026, 9, 15, 23, 0).toISOString(), now)).toBe('Yesterday')
  })
})

describe('classifyUpload', () => {
  const existing = [{ id: 'a', title: 'Atlas-Spec.pdf', metadata: { content_hash: 'h1', version: 2 } }, { id: 'b', title: 'Notes.docx', metadata: {} }]
  it('flags identical content as a duplicate, even under a different name', () => {
    expect(classifyUpload(existing, 'renamed.pdf', 'h1')).toEqual({ kind: 'duplicate', existing: existing[0] })
  })
  it('flags the same name with different content as a new version (case-insensitive)', () => {
    expect(classifyUpload(existing, 'atlas-spec.PDF', 'h2')).toEqual({ kind: 'same-name', existing: existing[0] })
    expect(classifyUpload(existing, 'notes.docx', null)).toEqual({ kind: 'same-name', existing: existing[1] })
  })
  it('treats everything else as new', () => {
    expect(classifyUpload(existing, 'other.pdf', 'h3')).toEqual({ kind: 'new' })
  })
  it('reads stored versions with a default of 1', () => {
    expect(storedVersion(existing[0].metadata)).toBe(2)
    expect(storedVersion({})).toBe(1)
    expect(storedVersion(null)).toBe(1)
  })
  it('hashes identical bytes identically', async () => {
    // jsdom's Blob has no arrayBuffer(); real browsers do, so use Node's here.
    const blob = (t: string) => new NodeBlob([t]) as unknown as Blob
    const [a, b, c] = await Promise.all([sha256Hex(blob('abc')), sha256Hex(blob('abc')), sha256Hex(blob('abd'))])
    expect(a).toBe(b); expect(a).not.toBe(c); expect(a).toHaveLength(64)
  })
})
