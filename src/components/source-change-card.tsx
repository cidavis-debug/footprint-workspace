import { claimLabel, claimValue, diffIsEmpty, diffSummary, type SourceChangeRow } from '@/lib/claim-diff'

const MAX_LINES = 6

function More({ total }: { total: number }) {
  return total > MAX_LINES ? <li className="text-muted-foreground">…and {total - MAX_LINES} more</li> : null
}

/** What changed in one source between two versions, and what it did to Radar alerts. */
export function SourceChangeCard({ change }: { change: SourceChangeRow }) {
  const d = change.diff
  return <article className="radar-change" aria-label={`${change.source_title} changed`}>
    <p className="text-sm text-muted-foreground">{new Date(change.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · v{change.version_from} → v{change.version_to}</p>
    <h3 className="font-heading text-h3">{change.source_title}</h3>
    <p>{diffIsEmpty(d) ? 'The document changed, but no engineering claims changed.' : diffSummary(d).replace(/^./, ch => ch.toUpperCase()) + '.'}</p>
    {d.changed.length > 0 && <ul className="radar-change-list" aria-label="Changed values">
      {d.changed.slice(0, MAX_LINES).map((c, i) => <li key={i}><strong>{claimLabel(c.after)}:</strong> <span className="radar-old">{claimValue(c.before)}</span> → <span className="radar-new">{claimValue(c.after)}</span></li>)}
      <More total={d.changed.length} />
    </ul>}
    {d.added.length > 0 && <ul className="radar-change-list" aria-label="Added claims">
      {d.added.slice(0, MAX_LINES).map((c, i) => <li key={i}>Added: <strong>{claimLabel(c)}</strong> = {claimValue(c)}</li>)}
      <More total={d.added.length} />
    </ul>}
    {d.removed.length > 0 && <ul className="radar-change-list" aria-label="Removed claims">
      {d.removed.slice(0, MAX_LINES).map((c, i) => <li key={i}>Removed: <strong>{claimLabel(c)}</strong> (was {claimValue(c)})</li>)}
      <More total={d.removed.length} />
    </ul>}
    {(d.alerts_raised.length > 0 || d.alerts_cleared.length > 0) && <ul className="radar-change-list" aria-label="Alert impact">
      {d.alerts_raised.map((a, i) => <li key={`r${i}`}>New alert ({a.severity}): {a.title}</li>)}
      {d.alerts_cleared.map((a, i) => <li key={`c${i}`}>No longer applies ({a.severity}): {a.title}</li>)}
    </ul>}
  </article>
}
