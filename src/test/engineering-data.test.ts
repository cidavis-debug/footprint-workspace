import { describe, expect, it } from 'vitest'
import { engineeringPrompt, filterAlerts, type EngineeringAlert, type EngineeringClaim, type EngineeringSource } from '@/lib/engineering-data'

const claim = (id: string, source_id: string, type: string): EngineeringClaim => ({ id, source_id, type, subject: 'Bus', attribute: 'Voltage', value: '24', unit: 'V', affected_systems: ['Power'], status: 'proposed', evidence_excerpt: 'Bus is 24 V.', confidence: 0.8 })
const alert = (status: string, alert_type = 'possible_conflict'): EngineeringAlert => ({ id: status, new_claim_id: 'new', related_claim_id: 'old', severity: 'high', alert_type, title: 'Possible voltage conflict', summary: '24 V versus 48 V.', affected_systems: ['Power'], status, created_at: '2026-10-12T00:00:00Z' })
const source = (id: string, status = 'ready'): EngineeringSource => ({ id, status, title: id, source_type: 'file', url: null, file_path: null, content_snippet: 'Bus is 24 V.', engineering_analysis_status: 'complete', engineering_summary: null })

describe('Engineering attention feed', () => {
  const claims = [claim('new', 'a', 'constraint'), claim('old', 'b', 'interface')]
  const alerts = [alert('reviewed'), alert('resolved'), alert('dismissed'), alert('open')]
  it('shows open before reviewed and excludes resolved/dismissed from All', () => expect(filterAlerts(alerts, claims, 'All').map(a => a.status)).toEqual(['open', 'reviewed']))
  it('filters interfaces, constraints, assumptions, and resolved', () => {
    expect(filterAlerts(alerts, claims, 'Interfaces')).toHaveLength(2)
    expect(filterAlerts(alerts, claims, 'Constraints')).toHaveLength(2)
    expect(filterAlerts(alerts, claims, 'Assumptions')).toHaveLength(0)
    expect(filterAlerts([alert('open', 'unsupported_assumption')], claims, 'Assumptions')).toHaveLength(1)
    expect(filterAlerts(alerts, claims, 'Resolved').map(a => a.status)).toEqual(['resolved'])
  })
  it('maps both conflicting sources and preserves approval status', () => {
    const prompt = engineeringPrompt([source('a'), source('b')], claims, alerts, 'Is there a conflict?')
    expect(prompt).toContain('"new_source":"S1"')
    expect(prompt).toContain('"related_source":"S2"')
    expect(prompt).toContain('"status":"proposed"')
    expect(prompt).toContain('Do not resolve conflicts')
    expect(prompt).not.toContain('"status":"resolved"')
  })
  it('excludes claims and alerts whose supporting sources are not in this workspace context', () => {
    const prompt = engineeringPrompt([source('a', 'indexing')], claims, alerts, 'Question')
    expect(prompt).not.toContain('"source_id":"b"')
    expect(prompt).toContain('"open_alerts":[]')
    expect(prompt).toContain('"text":null')
  })
})