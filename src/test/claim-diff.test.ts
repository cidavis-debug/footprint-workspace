import { describe, expect, it } from 'vitest'
import { claimLabel, claimValue, diffClaims, diffIsEmpty, diffSummary, readDiff, type DiffClaim } from '@/lib/claim-diff'
import { buildRadarReport, reportToHtml, reportToMarkdown } from '@/lib/radar-report'

const c = (subject: string, attribute: string, value: string, unit: string | null = null, extra: Partial<DiffClaim> = {}): DiffClaim => ({ type: 'constraint', subject, attribute, value, unit, status: 'approved', ...extra })

describe('diffClaims', () => {
  it('finds changed values, additions, removals, and unchanged claims', () => {
    const before = [c('Main bus', 'voltage', '24', 'V'), c('CAN bus', 'bit rate', '500', 'kbit/s'), c('Enclosure', 'rating', 'IP54'), c('Mass', 'max', '18', 'kg')]
    const after = [c('Main bus', 'voltage', '12', 'V'), c('CAN bus', 'bit rate', '500', 'kbit/s'), c('Enclosure', 'rating', 'IP54'), c('Battery', 'capacity', '10', 'Ah')]
    const d = diffClaims(before, after)
    expect(d.changed.map(x => [claimLabel(x.after), claimValue(x.before), claimValue(x.after)])).toEqual([['Main bus — voltage', '24 V', '12 V']])
    expect(d.added.map(claimLabel)).toEqual(['Battery — capacity'])
    expect(d.removed.map(claimLabel)).toEqual(['Mass — max'])
    expect(d.unchanged).toBe(2)
  })

  it('ignores case, spacing, and unit formatting differences', () => {
    const d = diffClaims([c('Main Bus', 'Voltage', '24 V', null)], [c('main  bus', 'voltage', '24', 'v')])
    expect(diffIsEmpty(d)).toBe(true)
    expect(d.unchanged).toBe(1)
  })

  it('treats a status change as a change', () => {
    const d = diffClaims([c('Main bus', 'voltage', '24', 'V', { status: 'proposed' })], [c('Main bus', 'voltage', '24', 'V', { status: 'approved' })])
    expect(d.changed).toHaveLength(1)
  })

  it('matches a renamed subject when the attribute is unique', () => {
    const d = diffClaims([c('Main bus', 'nominal voltage', '24', 'V')], [c('Main power bus', 'nominal voltage', '12', 'V')])
    expect(d.changed).toHaveLength(1)
    expect(d.added).toHaveLength(0)
    expect(d.removed).toHaveLength(0)
  })

  it('does not guess when several claims share an attribute', () => {
    const d = diffClaims([c('Motor A', 'voltage', '12', 'V'), c('Motor B', 'voltage', '24', 'V')], [c('Pump A', 'voltage', '12', 'V'), c('Pump B', 'voltage', '24', 'V')])
    expect(d.added).toHaveLength(2)
    expect(d.removed).toHaveLength(2)
  })

  it('does not mix claim types', () => {
    const d = diffClaims([c('Runtime', 'hours', '4', null, { type: 'assumption' })], [c('Runtime', 'hours', '4', null, { type: 'requirement' })])
    expect(d.changed).toHaveLength(0)
    expect(d.added).toHaveLength(1)
  })
})

describe('summaries', () => {
  it('describes a diff in one line', () => {
    const d = { ...diffClaims([c('A', 'x', '1'), c('B', 'y', '1')], [c('A', 'x', '2'), c('C', 'z', '3')]), alerts_raised: [], alerts_cleared: [] }
    expect(diffSummary(d)).toBe('1 value changed, 1 added, 1 removed')
    expect(diffSummary({ ...d, added: [], removed: [], changed: [] })).toBe('no engineering claims changed')
  })
  it('reads stored rows tolerantly', () => {
    expect(readDiff(null)).toEqual({ added: [], removed: [], changed: [], unchanged: 0, alerts_raised: [], alerts_cleared: [] })
    expect(readDiff({ added: [c('A', 'x', '1')], unchanged: 3 }).added).toHaveLength(1)
  })
})

describe('report with source changes', () => {
  const diff = { ...diffClaims([c('Main bus', 'voltage', '24', 'V')], [c('Main bus', 'voltage', '12', 'V')]), alerts_raised: [{ title: 'Bus voltage conflict', severity: 'high' }], alerts_cleared: [] }
  const change = { id: '1', source_id: 's1', source_title: 'Atlas-Spec.pdf <b>', version_from: 1, version_to: 2, created_at: '2026-10-16T12:00:00Z', diff }
  const report = buildRadarReport({ workspace: 'Atlas', filter: 'All', alerts: [], claims: [], sources: [], changes: [change], generatedAt: new Date('2026-10-16T15:00:00Z') })

  it('adds a changes section to markdown', () => {
    const md = reportToMarkdown(report)
    expect(md).toContain('## Recent source changes')
    expect(md).toContain('### Atlas-Spec.pdf <b> (v1 → v2, 2026-10-16)')
    expect(md).toContain('- Main bus — voltage: 24 V → 12 V')
    expect(md).toContain('- New alert (high): Bus voltage conflict')
  })
  it('escapes change text in the HTML report', () => {
    const html = reportToHtml(report)
    expect(html).toContain('Atlas-Spec.pdf &lt;b&gt;')
    expect(html).not.toContain('Atlas-Spec.pdf <b>')
    expect(html).toContain('24 V → 12 V')
  })
})
