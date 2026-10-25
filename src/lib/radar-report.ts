import type { EngineeringAlert, EngineeringClaim, EngineeringSource } from './engineering-data'
import { alertConfidence, staleHintText, staleSourceHint } from './claim-confidence'
import { truncationNotices } from './truncation'
import { claimLabel, claimValue, diffIsEmpty, diffSummary, type SourceChangeRow } from './claim-diff'

export type ReportClaim = { source: string; type: string; subject: string; attribute: string; value: string; status: string; confidence: number; excerpt: string }
export type ReportAlert = { title: string; summary: string; severity: string; type: string; status: string; systems: string[]; created: string; confidence: string | null; currentHint: string; claims: { label: string; claim: ReportClaim }[] }
export type ReportChange = { source: string; versions: string; date: string; summary: string; lines: string[] }
export type RadarReport = {
  workspace: string
  filter: string
  generatedAt: string
  sourceCount: number
  counts: { total: number; high: number; medium: number; low: number }
  alerts: ReportAlert[]
  changes: ReportChange[]
  limited: { source: string; notices: string[] }[]
}

const day = (iso: string) => iso.slice(0, 10)
const severityRank = (s: string) => s === 'high' ? 0 : s === 'medium' ? 1 : 2
const words = (s: string) => s.replaceAll('_', ' ')

/** Plain data for a report: alerts (already filtered/ordered by the caller) joined with their claims and source titles, most severe first. */
export function buildRadarReport(input: { workspace: string; filter: string; alerts: EngineeringAlert[]; claims: EngineeringClaim[]; sources: EngineeringSource[]; changes?: SourceChangeRow[]; locations?: Record<string, string>; generatedAt?: Date }): RadarReport {
  const claimById = new Map(input.claims.map(c => [c.id, c]))
  const sourceTitle = new Map(input.sources.map(s => [s.id, s.title]))
  const toClaim = (c: EngineeringClaim): ReportClaim => ({
    source: `${sourceTitle.get(c.source_id) ?? 'Unknown source'}${input.locations?.[c.id] ? `, ${input.locations[c.id]}` : ''}`, type: c.type, subject: c.subject, attribute: c.attribute,
    value: `${c.value}${c.unit ? ` ${c.unit}` : ''}`, status: c.status, confidence: c.confidence, excerpt: c.evidence_excerpt,
  })
  const alerts = input.alerts
    .map((a, i) => ({ a, i }))
    .sort((x, y) => severityRank(x.a.severity) - severityRank(y.a.severity) || x.i - y.i)
    .map(({ a }): ReportAlert => {
      const claims: ReportAlert['claims'] = []
      const fresh = claimById.get(a.new_claim_id), related = a.related_claim_id ? claimById.get(a.related_claim_id) : undefined
      if (fresh) claims.push({ label: 'New claim', claim: toClaim(fresh) })
      if (related) claims.push({ label: 'Related existing claim', claim: toClaim(related) })
      const both = fresh && related ? staleSourceHint(fresh, related, input.sources) : null
      return { title: a.title, summary: a.summary, severity: a.severity, type: words(a.alert_type), status: a.status, systems: a.affected_systems, created: a.created_at, confidence: alertConfidence([fresh, related].filter(c => c !== undefined)), currentHint: both ? staleHintText(both) : 'Cannot tell which is current', claims }
    })
  const count = (sev: string) => alerts.filter(a => a.severity === sev).length
  return {
    workspace: input.workspace, filter: input.filter, generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    changes: (input.changes ?? []).slice(0, 10).map((c): ReportChange => ({
      source: c.source_title, versions: `v${c.version_from} → v${c.version_to}`, date: day(c.created_at),
      summary: diffIsEmpty(c.diff) ? 'The document changed, but no engineering claims changed.' : diffSummary(c.diff),
      lines: [
        ...c.diff.changed.map(x => `${claimLabel(x.after)}: ${claimValue(x.before)} → ${claimValue(x.after)}`),
        ...c.diff.added.map(x => `Added: ${claimLabel(x)} = ${claimValue(x)}`),
        ...c.diff.removed.map(x => `Removed: ${claimLabel(x)} (was ${claimValue(x)})`),
        ...c.diff.alerts_raised.map(a => `New alert (${a.severity}): ${a.title}`),
        ...c.diff.alerts_cleared.map(a => `No longer applies (${a.severity}): ${a.title}`),
      ],
    })),
    limited: input.sources.flatMap(s => { const notices = truncationNotices(s.metadata); return notices.length ? [{ source: s.title, notices }] : [] }),
    sourceCount: input.sources.length, counts: { total: alerts.length, high: count('high'), medium: count('medium'), low: count('low') }, alerts,
  }
}

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()
const NOTE = 'Alerts are AI-generated suggestions extracted from workspace sources. They are not approvals or decisions; verify each against the cited source documents.'

export function reportToMarkdown(r: RadarReport): string {
  const out: string[] = [
    '# Footprint AI — Engineering Radar Report', '',
    `**Workspace:** ${r.workspace}  `, `**View:** ${r.filter}  `, `**Generated:** ${day(r.generatedAt)}  `, `**Sources in workspace:** ${r.sourceCount}`, '',
    '## Summary', '',
    r.counts.total === 0 ? 'No alerts need attention.' : `${r.counts.total} alert${r.counts.total === 1 ? '' : 's'}: ${r.counts.high} high, ${r.counts.medium} medium, ${r.counts.low} low severity.`, '',
  ]
  r.alerts.forEach((a, i) => {
    out.push(`## ${i + 1}. ${oneLine(a.title)}`, '', `**Severity:** ${a.severity} · **Type:** ${a.type} · **Status:** ${a.status}${a.confidence ? ` · **Confidence:** ${a.confidence}` : ''}`, '', oneLine(a.summary), '', `_${a.currentHint}. This is a rough hint from claim status and source dates, not a decision._`, '')
    if (a.systems.length) out.push(`**Affected systems:** ${a.systems.join(', ')}`, '')
    for (const { label, claim: c } of a.claims) {
      out.push(`- **${label}** (${c.source}): ${oneLine(c.subject)} — ${oneLine(c.attribute)} = **${oneLine(c.value)}** · ${c.type}, ${c.status}, confidence ${Math.round(c.confidence * 100)}%`)
      if (c.excerpt) out.push(`  > ${oneLine(c.excerpt)}`)
    }
    out.push('')
  })
  if (r.changes.length) {
    out.push('## Recent source changes', '')
    for (const c of r.changes) { out.push(`### ${oneLine(c.source)} (${c.versions}, ${c.date})`, '', c.summary, ''); for (const l of c.lines) out.push(`- ${oneLine(l)}`); out.push('') }
  }
  if (r.limited.length) {
    out.push('## Sources with limited analysis', '')
    for (const l of r.limited) for (const n of l.notices) out.push(`- **${oneLine(l.source)}:** ${n}`)
    out.push('')
  }
  out.push('---', '', `_${NOTE}_`, '')
  return out.join('\n')
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Standalone, print-ready HTML (use the browser's Print → Save as PDF). All text is escaped. */
export function reportToHtml(r: RadarReport): string {
  const alerts = r.alerts.map((a, i) => `<section class="alert" data-severity="${esc(a.severity)}">
  <h2>${i + 1}. ${esc(oneLine(a.title))}</h2>
  <p class="meta"><span class="sev">${esc(a.severity)}</span> · ${esc(a.type)} · ${esc(a.status)}${a.confidence ? ` · confidence ${esc(a.confidence)}` : ''}</p>
  <p class="meta">${esc(a.currentHint)} (a rough hint, not a decision)</p>
  <p>${esc(oneLine(a.summary))}</p>
  ${a.systems.length ? `<p class="meta">Affected systems: ${esc(a.systems.join(', '))}</p>` : ''}
  ${a.claims.map(({ label, claim: c }) => `<div class="claim"><p><b>${esc(label)}</b> · ${esc(c.source)}</p><p>${esc(oneLine(c.subject))} — ${esc(oneLine(c.attribute))} = <b>${esc(oneLine(c.value))}</b> <span class="meta">(${esc(c.type)}, ${esc(c.status)}, confidence ${Math.round(c.confidence * 100)}%)</span></p>${c.excerpt ? `<blockquote>${esc(oneLine(c.excerpt))}</blockquote>` : ''}</div>`).join('\n  ')}
</section>`).join('\n')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Engineering Radar Report — ${esc(r.workspace)}</title>
<style>
  body { font: 15px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #12151b; max-width: 780px; margin: 32px auto; padding: 0 20px; }
  h1 { font-size: 26px; margin: 0 0 4px; } h2 { font-size: 17px; margin: 0 0 4px; }
  .meta { color: #5b6472; font-size: 13px; margin: 2px 0; }
  .sum { display: flex; gap: 12px; margin: 14px 0 22px; flex-wrap: wrap; } .sum div { border: 1px solid #d5d9df; border-radius: 10px; padding: 8px 14px; } .sum b { display: block; font-size: 22px; }
  .alert { border: 1px solid #d5d9df; border-left: 5px solid #f5b400; border-radius: 10px; padding: 12px 16px; margin: 14px 0; break-inside: avoid; }
  .alert[data-severity=high] { border-left-color: #d93025; } .alert[data-severity=low] { border-left-color: #1a73e8; }
  .changes-h { margin-top: 26px; } .alert.change { border-left-color: #1a73e8; } .alert ul { margin: 6px 0; padding-left: 20px; }
  .sev { text-transform: uppercase; font-weight: 700; font-size: 12px; letter-spacing: .06em; }
  .claim { background: #f4f5f7; border-radius: 8px; padding: 8px 12px; margin: 8px 0; } .claim p { margin: 2px 0; }
  blockquote { margin: 4px 0 2px; padding-left: 10px; border-left: 3px solid #c3c8d0; color: #3b4350; font-style: italic; }
  .note { margin-top: 28px; color: #5b6472; font-size: 12.5px; border-top: 1px solid #d5d9df; padding-top: 10px; }
  .actions { margin-bottom: 18px; } button { font: inherit; padding: 6px 14px; border-radius: 8px; border: 1px solid #12151b; background: #12151b; color: #fff; cursor: pointer; }
  @media print { .actions { display: none; } body { margin: 0; max-width: none; } }
</style></head><body>
<div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
<h1>Engineering Radar Report</h1>
<p class="meta">Workspace: ${esc(r.workspace)} · View: ${esc(r.filter)} · Generated ${esc(day(r.generatedAt))} · ${r.sourceCount} source${r.sourceCount === 1 ? '' : 's'}</p>
<div class="sum"><div><b>${r.counts.total}</b>alerts</div><div><b>${r.counts.high}</b>high</div><div><b>${r.counts.medium}</b>medium</div><div><b>${r.counts.low}</b>low</div></div>
${r.alerts.length ? alerts : '<p>No alerts need attention.</p>'}
${r.changes.length ? `<h2 class="changes-h">Recent source changes</h2>
${r.changes.map(c => `<section class="alert change"><h2>${esc(oneLine(c.source))} <span class="meta">${esc(c.versions)} · ${esc(c.date)}</span></h2><p>${esc(c.summary)}</p>${c.lines.length ? `<ul>${c.lines.map(l => `<li>${esc(oneLine(l))}</li>`).join('')}</ul>` : ''}</section>`).join('\n')}` : ''}
${r.limited.length ? `<h2 class="changes-h">Sources with limited analysis</h2><ul>${r.limited.flatMap(l => l.notices.map(n => `<li><b>${esc(oneLine(l.source))}:</b> ${esc(n)}</li>`)).join('')}</ul>` : ''}
<p class="note">${esc(NOTE)}</p>
</body></html>`
}

export function reportFileName(r: RadarReport, ext: 'md' | 'html'): string {
  const slug = r.workspace.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace'
  return `footprint-radar-${slug}-${day(r.generatedAt)}.${ext}`
}
