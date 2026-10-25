import { createFileRoute, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Badge, Button, CitationChip, Icon } from '@/design-system/footprint-0a8b1a'
import { Illustration } from '@/components/illustration'
import { pageHead } from '@/components/page-head'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/hooks/use-auth'
import { SeverityBadge } from '@/components/engineering-context'
import { SourceChangeCard } from '@/components/source-change-card'
import { ClaimEvidence, SourceEvidenceDrawer } from '@/components/source-evidence-drawer'
import { alertConfidence, staleHintText, staleSourceHint } from '@/lib/claim-confidence'
import { truncationNotices } from '@/lib/truncation'
import { filterAlerts, radarFilters, type RadarFilter } from '@/lib/engineering-data'
import { getRadar, reviewRadarAlert } from '@/lib/radar.functions'
import { buildRadarReport, reportFileName, reportToHtml, reportToMarkdown } from '@/lib/radar-report'

const radarQuery = (userId: string, workspaceId?: string) => queryOptions({ queryKey: ['radar', userId, workspaceId], queryFn: () => getRadar({ data: { workspaceId } }) })
export const Route = createFileRoute('/_authenticated/radar')({
  validateSearch: (s: Record<string, unknown>): { workspace?: string } => typeof s['workspace'] === 'string' && /^[0-9a-f-]{36}$/i.test(s['workspace']) ? { workspace: s['workspace'] } : {},
  loaderDeps: ({ search }) => ({ workspace: search.workspace }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(radarQuery(context.radarUserId, deps.workspace)),
  head: () => pageHead('Radar — Footprint AI', 'Review conflicts across every connected source, with evidence, severity, confidence and a likely out-of-date source hint.'),
  pendingComponent: () => <main className="site-width"><p className="workspace-status" role="status">Opening Radar…</p></main>,
  errorComponent: ({ error, reset }) => <main className="site-width"><h1 className="font-heading text-h1">Radar unavailable</h1><p role="alert">{error instanceof Error ? error.message : 'Could not load Radar.'}</p><Button variant="quiet" onClick={reset}>Try again</Button><Link to="/app" className="site-link">Return to chat</Link></main>,
  component: Radar,
})
function Radar() {
  const { workspace } = Route.useSearch()
  const { radarUserId } = Route.useRouteContext()
  const { data } = useSuspenseQuery(radarQuery(radarUserId, workspace))
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const review = useServerFn(reviewRadarAlert)
  const [filter, setFilter] = useState<RadarFilter>('All')
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const visible = filterAlerts(data.alerts, data.claims, filter)
  const limited = data.sources.flatMap(s => { const notices = truncationNotices(s.metadata); return notices.length ? [{ id: s.id, title: s.title, notices }] : [] })
  const update = async (id: string, status: 'reviewed' | 'resolved' | 'dismissed') => {
    setBusy(id); setError('')
    try { await review({ data: { id, workspaceId: data.workspaceId, status } }); await queryClient.invalidateQueries({ queryKey: ['radar'] }) }
    catch { setError('Could not update the alert. Please try again.') }
    finally { setBusy('') }
  }
  const makeReport = () => buildRadarReport({ workspace: data.workspaces.find(w => w.id === data.workspaceId)?.name ?? 'Workspace', filter, alerts: visible, claims: data.claims, sources: data.sources, changes: data.changes, locations: data.locations })
  const downloadReport = () => {
    const report = makeReport()
    const url = URL.createObjectURL(new Blob([reportToMarkdown(report)], { type: 'text/markdown;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = reportFileName(report, 'md'); document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  const printReport = () => {
    const url = URL.createObjectURL(new Blob([reportToHtml(makeReport())], { type: 'text/html;charset=utf-8' }))
    if (!window.open(url, '_blank')) setError('Your browser blocked the report window. Allow pop-ups for this site and try again.')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
  const { user, signOut } = useAuth()
  return <AppShell workspaces={data.workspaces} value={data.workspaceId} onChange={id => { setSourceId(null); void navigate({ search: { workspace: id } }) }} mode="radar" email={user?.email ?? null} onSignOut={signOut}><main className="radar-shell">
    <section className="radar-main">
      <p className="section-kicker">Engineering Change Radar</p><h1 className="font-heading text-h1">Radar</h1>
      <div className="radar-filters" role="group" aria-label="Filter engineering alerts">{radarFilters.map(f => <Button key={f} variant={f === filter ? 'primary' : 'ghost'} size="sm" aria-pressed={f === filter} onClick={() => setFilter(f)}>{f}</Button>)}</div>
      <div className="radar-export" role="group" aria-label="Export report">
        <Button size="sm" variant="quiet" disabled={visible.length === 0} onClick={downloadReport}>Download report (.md)</Button>
        <Button size="sm" variant="quiet" disabled={visible.length === 0} onClick={printReport}>Print / save as PDF</Button>
      </div>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {limited.length > 0 && <section className="radar-limited" aria-label="Sources with limited analysis" role="note">
        <h2 className="font-heading text-h2">Limited analysis</h2>
        {limited.map(l => <p key={l.id} className="text-muted-foreground"><strong>{l.title}:</strong> {l.notices.join(' ')}</p>)}
      </section>}
      {data.changes.length > 0 && <section className="radar-changes" aria-label="Recent source changes">
        <h2 className="font-heading text-h2">Recent source changes</h2>
        {data.changes.slice(0, 5).map(c => <SourceChangeCard key={c.id} change={c} />)}
      </section>}
      {visible.length === 0 ? <div className="radar-empty"><Illustration name="verified" /><h2 className="font-heading text-h2">{filter === 'All' ? 'Nothing needs your attention.' : `No ${filter.toLowerCase()} alerts.`}</h2><p className="text-muted-foreground">Footprint AI compares claims across every connected source and raises conflicts, changed constraints, interface mismatches, EBOM-to-MBOM differences and unsupported assumptions, with evidence for your team to review.</p></div> : <div className="radar-feed">{visible.map(a => {
        const claims = [data.claims.find(c => c.id === a.new_claim_id), data.claims.find(c => c.id === a.related_claim_id)].filter(c => c !== undefined)
        const sources = data.sources.filter(s => claims.some(c => c.source_id === s.id))
        const confidence = alertConfidence(claims)
        const current = claims.length === 2 ? staleHintText(staleSourceHint(claims[0], claims[1], data.sources)) : null
        return <article className="radar-alert" key={a.id} aria-label={a.title}>
          <div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={a.severity} /><Badge variant="reference">{a.alert_type.replaceAll('_', ' ')}</Badge><Badge variant="reference">{a.status}</Badge>{confidence && <Badge variant="reference">Confidence: {confidence}</Badge>}</div>
          <h2 className="font-heading text-h2">{a.title}</h2><p>{a.summary}</p>
          {current && <p className="text-muted-foreground">{current}</p>}
          {a.affected_systems.length > 0 && <p className="text-muted-foreground">Affected systems: {a.affected_systems.join(', ')}</p>}
          <details><summary className="engineering-summary">Claims & evidence</summary><div className="space-y-4 mt-4">{claims.map((c, i) => <div key={c.id}><p className="text-sm text-muted-foreground">{i === 0 ? 'New claim' : 'Related existing claim'}</p><ClaimEvidence claim={c} location={data.locations[c.id]} onSource={() => setSourceId(c.source_id)} /></div>)}{claims.length === 0 && <p className="text-muted-foreground">Supporting claims are no longer available.</p>}</div></details>
          <div className="flex flex-wrap gap-2">{sources.map(s => <CitationChip key={s.id} href="#evidence" kind={s.source_type === 'file' ? 'file' : 'link'} onClick={e => { e.preventDefault(); setSourceId(s.id) }}>{s.title}</CitationChip>)}</div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="quiet" disabled={busy === a.id} onClick={() => void update(a.id, 'reviewed')}><Icon name="Check" /> Review</Button><Button size="sm" variant="quiet" disabled={busy === a.id} onClick={() => void update(a.id, 'resolved')}>Resolve</Button><Button size="sm" variant="ghost" disabled={busy === a.id} onClick={() => void update(a.id, 'dismissed')}><Icon name="X" /> Dismiss</Button></div>
        </article>
      })}</div>}
    </section>
    <SourceEvidenceDrawer source={data.sources.find(s => s.id === sourceId) ?? null} claims={data.claims.filter(c => c.source_id === sourceId)} onClose={() => setSourceId(null)} />
  </main></AppShell>
}