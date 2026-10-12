import { createFileRoute, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Badge, Button, CitationChip, Icon } from '@/design-system/footprint-0a8b1a'
import { Brand } from '@/components/brand'
import { Illustration } from '@/components/illustration'
import { pageHead } from '@/components/page-head'
import { WorkspacePicker } from '@/components/workspace-picker'
import { SeverityBadge } from '@/components/engineering-context'
import { ClaimEvidence, SourceEvidenceDrawer } from '@/components/source-evidence-drawer'
import { filterAlerts, radarFilters, type RadarFilter } from '@/lib/engineering-data'
import { getRadar, reviewRadarAlert } from '@/lib/radar.functions'

const radarQuery = (workspaceId?: string) => queryOptions({ queryKey: ['radar', workspaceId], queryFn: () => getRadar({ data: { workspaceId } }) })
export const Route = createFileRoute('/_authenticated/radar')({
  validateSearch: (s: Record<string, unknown>): { workspace?: string } => typeof s['workspace'] === 'string' && /^[0-9a-f-]{36}$/i.test(s['workspace']) ? { workspace: s['workspace'] } : {},
  loaderDeps: ({ search }) => ({ workspace: search.workspace }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(radarQuery(deps.workspace)),
  head: () => pageHead('Radar — Footprint', 'Review possible engineering conflicts, constraints, interfaces, and assumptions with their supporting evidence.'),
  pendingComponent: () => <main className="site-width"><p className="workspace-status" role="status">Opening Radar…</p></main>,
  errorComponent: ({ error, reset }) => <main className="site-width"><h1 className="font-heading text-greeting">Radar unavailable</h1><p role="alert">{error instanceof Error ? error.message : 'Could not load Radar.'}</p><Button variant="quiet" onClick={reset}>Try again</Button><Link to="/app" className="site-link">Return to chat</Link></main>,
  component: Radar,
})
function Radar() {
  const { workspace } = Route.useSearch()
  const { data } = useSuspenseQuery(radarQuery(workspace))
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const review = useServerFn(reviewRadarAlert)
  const [filter, setFilter] = useState<RadarFilter>('All')
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const visible = filterAlerts(data.alerts, data.claims, filter)
  const update = async (id: string, status: 'reviewed' | 'resolved' | 'dismissed') => {
    setBusy(id); setError('')
    try { await review({ data: { id, workspaceId: data.workspaceId, status } }); await queryClient.invalidateQueries({ queryKey: ['radar'] }) }
    catch { setError('Could not update the alert. Please try again.') }
    finally { setBusy('') }
  }
  return <main className="site-width">
    <header className="workspace-header"><Link to="/" className="wordmark"><Brand /></Link><div className="workspace-actions flex-wrap">
      <WorkspacePicker workspaces={data.workspaces} value={data.workspaceId} onChange={id => { setSourceId(null); void navigate({ search: { workspace: id } }) }} />
      <Link className="site-link" to="/app" search={{ workspace: data.workspaceId }}><Icon name="Sparkles" /> Chat</Link>
      <span className="site-link" aria-current="page">Radar</span>
    </div></header>
    <section className="radar-main">
      <p className="section-kicker">Engineering attention</p><h1 className="font-heading text-greeting">Radar</h1>
      <div className="radar-filters" role="group" aria-label="Filter engineering alerts">{radarFilters.map(f => <Button key={f} variant={f === filter ? 'primary' : 'ghost'} size="sm" aria-pressed={f === filter} onClick={() => setFilter(f)}>{f}</Button>)}</div>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {visible.length === 0 ? <div className="radar-empty"><Illustration name="verified" /><h2 className="font-heading text-section">{filter === 'All' ? 'Nothing needs your attention.' : `No ${filter.toLowerCase()} alerts.`}</h2><p className="text-muted-foreground">Footprint analyzes new sources for possible engineering conflicts, changed constraints, interface mismatches, and unsupported assumptions.</p></div> : <div className="space-y-5">{visible.map(a => {
        const claims = [data.claims.find(c => c.id === a.new_claim_id), data.claims.find(c => c.id === a.related_claim_id)].filter(c => c !== undefined)
        const sources = data.sources.filter(s => claims.some(c => c.source_id === s.id))
        return <article className="radar-alert" key={a.id} aria-label={a.title}>
          <div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={a.severity} /><Badge variant="reference">{a.alert_type.replaceAll('_', ' ')}</Badge><Badge variant="reference">{a.status}</Badge></div>
          <h2 className="font-heading text-section">{a.title}</h2><p>{a.summary}</p>
          {a.affected_systems.length > 0 && <p className="text-muted-foreground">Affected systems: {a.affected_systems.join(', ')}</p>}
          <details><summary className="engineering-summary">Claims & evidence</summary><div className="space-y-4 mt-4">{claims.map((c, i) => <div key={c.id}><p className="text-label text-muted-foreground">{i === 0 ? 'New claim' : 'Related existing claim'}</p><ClaimEvidence claim={c} onSource={() => setSourceId(c.source_id)} /></div>)}{claims.length === 0 && <p className="text-muted-foreground">Supporting claims are no longer available.</p>}</div></details>
          <div className="flex flex-wrap gap-2">{sources.map(s => <CitationChip key={s.id} href="#evidence" kind={s.source_type === 'file' ? 'file' : 'link'} onClick={e => { e.preventDefault(); setSourceId(s.id) }}>{s.title}</CitationChip>)}</div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="quiet" disabled={busy === a.id} onClick={() => void update(a.id, 'reviewed')}><Icon name="Check" /> Review</Button><Button size="sm" variant="quiet" disabled={busy === a.id} onClick={() => void update(a.id, 'resolved')}>Resolve</Button><Button size="sm" variant="ghost" disabled={busy === a.id} onClick={() => void update(a.id, 'dismissed')}><Icon name="X" /> Dismiss</Button></div>
        </article>
      })}</div>}
    </section>
    <SourceEvidenceDrawer source={data.sources.find(s => s.id === sourceId) ?? null} claims={data.claims.filter(c => c.source_id === sourceId)} onClose={() => setSourceId(null)} />
  </main>
}