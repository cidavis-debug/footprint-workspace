import { describe, expect, it } from 'vitest'
import { buildRadarReport, reportFileName, reportToHtml, reportToMarkdown } from '@/lib/radar-report'
import type { EngineeringAlert, EngineeringClaim, EngineeringSource } from '@/lib/engineering-data'

const source = (id: string, title: string): EngineeringSource => ({ id, title, source_type: 'file', url: null, file_path: null, content_snippet: null, status: 'ready', engineering_analysis_status: 'complete', engineering_summary: null })
const claim = (id: string, source_id: string, value: string, extra: Partial<EngineeringClaim> = {}): EngineeringClaim => ({ id, source_id, type: 'constraint', subject: 'Main bus', attribute: 'voltage', value, unit: 'V', affected_systems: [], status: 'approved', evidence_excerpt: `Bus is ${value} V`, confidence: 0.9, ...extra })
const alert = (id: string, severity: string, extra: Partial<EngineeringAlert> = {}): EngineeringAlert => ({ id, new_claim_id: 'c2', related_claim_id: 'c1', severity, alert_type: 'possible_conflict', title: `Alert ${id}`, summary: 'Values differ.', affected_systems: ['Power'], status: 'open', created_at: '2026-10-16T12:00:00Z', ...extra })

const sources = [source('s1', 'Spec.pdf'), source('s2', 'Deck.pptx')]
const claims = [claim('c1', 's1', '24'), claim('c2', 's2', '12')]
const build = (alerts: EngineeringAlert[], workspace = 'Atlas Rover') => buildRadarReport({ workspace, filter: 'All', alerts, claims, sources, generatedAt: new Date('2026-10-16T15:00:00Z') })

describe('radar report', () => {
  it('orders alerts by severity and counts them', () => {
    const r = build([alert('a', 'low'), alert('b', 'high'), alert('c', 'medium'), alert('d', 'high')])
    expect(r.alerts.map(a => a.title)).toEqual(['Alert b', 'Alert d', 'Alert c', 'Alert a'])
    expect(r.counts).toEqual({ total: 4, high: 2, medium: 1, low: 1 })
    expect(r.sourceCount).toBe(2)
  })

  it('joins claims with their source titles', () => {
    const r = build([alert('a', 'high')])
    expect(r.alerts[0].claims.map(c => [c.label, c.claim.source, c.claim.value])).toEqual([['New claim', 'Deck.pptx', '12 V'], ['Related existing claim', 'Spec.pdf', '24 V']])
  })

  it('renders markdown with evidence and a disclaimer', () => {
    const md = reportToMarkdown(build([alert('a', 'high')]))
    expect(md).toContain('# Footprint AI — Engineering Radar Report')
    expect(md).toContain('**Workspace:** Atlas Rover')
    expect(md).toContain('1 alert: 1 high, 0 medium, 0 low severity.')
    expect(md).toContain('## 1. Alert a')
    expect(md).toContain('**New claim** (Deck.pptx): Main bus — voltage = **12 V**')
    expect(md).toContain('> Bus is 24 V')
    expect(md).toContain('not approvals')
  })

  it('handles an empty report', () => {
    expect(reportToMarkdown(build([]))).toContain('No alerts need attention.')
    expect(reportToHtml(build([]))).toContain('No alerts need attention.')
  })

  it('escapes untrusted text in the HTML report', () => {
    const html = reportToHtml(build([alert('a', 'high', { title: '<script>alert(1)</script>', summary: 'x " & y' })], '<img src=x onerror=alert(1)>'))
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('x &quot; &amp; y')
  })

  it('builds safe file names', () => {
    expect(reportFileName(build([], 'Atlas / Rover (v2)!'), 'md')).toBe('footprint-radar-atlas-rover-v2-2026-10-16.md')
    expect(reportFileName(build([], '???'), 'html')).toBe('footprint-radar-workspace-2026-10-16.html')
  })
})
