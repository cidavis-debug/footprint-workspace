import { useEffect, useState } from 'react'
import { Badge, Button, Input } from '@/design-system/footprint-0a8b1a'
import { supabase } from '@/integrations/supabase/client'

export type Claim = { id: string; type: string; subject: string; attribute: string; value: string; unit: string | null; evidence_excerpt: string; confidence: number }
export type Alert = { id: string; alert_type: string; severity: string; title: string; summary: string; status: string; new_claim_id: string; related_claim_id: string | null }

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge variant="reference" className="engineering-severity" data-severity={severity}>{severity}</Badge>
}

export function analysisLabel(status: string) {
  return status === 'processing' ? 'Analyzing' : status === 'complete' ? 'Analyzed' : status === 'failed' ? 'Analysis failed' : 'Not analyzed'
}

export function SourceEngineering({ sourceId, status, summary, onReanalyze, busy }: { sourceId: string; status: string; summary: string | null; onReanalyze: () => void; busy: boolean }) {
  const [open, setOpen] = useState(false)
  const [claims, setClaims] = useState<Claim[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!open) return
    void supabase.from('engineering_claims').select('id, type, subject, attribute, value, unit, evidence_excerpt, confidence').eq('source_id', sourceId).order('created_at').then(({ data }) => setClaims(data ?? []))
  }, [open, sourceId, status])

  const save = async (id: string) => {
    const value = draft.trim(); if (!value) return
    const { error } = await supabase.from('engineering_claims').update({ value }).eq('id', id)
    if (!error) setClaims(c => c.map(x => x.id === id ? { ...x, value } : x))
    setEditing(null)
  }
  const remove = async (id: string) => {
    const { error } = await supabase.from('engineering_claims').delete().eq('id', id)
    if (!error) setClaims(c => c.filter(x => x.id !== id))
  }

  return <details className="mb-3 ml-4 text-xs" onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}>
    <summary className="cursor-pointer text-muted-foreground">Engineering context · {analysisLabel(status)}</summary>
    <div className="mt-2 space-y-2">
      {summary && <p>{summary}</p>}
      {open && claims.length === 0 && <p className="text-muted-foreground">{status === 'complete' ? 'No engineering claims found.' : 'No claims yet.'}</p>}
      {claims.map(c => <div key={c.id} className="border-t border-border pt-2">
        <p><Badge variant="reference">{c.type}</Badge> <strong className="text-ink">{c.subject}</strong> — {c.attribute}</p>
        {editing === c.id
          ? <form className="mt-1 flex gap-2" onSubmit={e => { e.preventDefault(); void save(c.id) }}><Input aria-label="Claim value" value={draft} onChange={e => setDraft(e.target.value)} autoFocus /><Button type="submit" size="sm" variant="quiet">Save</Button></form>
          : <p>{c.value}{c.unit ? ` ${c.unit}` : ''}</p>}
        {c.evidence_excerpt && <p className="text-muted-foreground">“{c.evidence_excerpt}”</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setEditing(c.id); setDraft(c.value) }}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => void remove(c.id)}>Delete</Button>
        </div>
      </div>)}
      <Button size="sm" variant="quiet" onClick={onReanalyze} loading={busy}>{status === 'failed' ? 'Retry analysis' : 'Reanalyze'}</Button>
    </div>
  </details>
}

export function EngineeringAlerts({ workspaceId, refreshKey }: { workspaceId: string; refreshKey: number }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    setAlerts([]); setError('')
    if (!workspaceId) return
    let cancelled = false
    void supabase.from('engineering_alerts').select('id, alert_type, severity, title, summary, status, new_claim_id, related_claim_id').eq('workspace_id', workspaceId).eq('status', 'open').order('created_at', { ascending: false }).then(({ data, error: failure }) => { if (!cancelled) { setAlerts(data ?? []); if (failure) setError('Could not load engineering review suggestions.') } })
    return () => { cancelled = true }
  }, [workspaceId, refreshKey])
  const setStatus = async (id: string, status: 'reviewed' | 'resolved' | 'dismissed') => {
    const { error } = await supabase.from('engineering_alerts').update({ status }).eq('id', id)
    if (!error) setAlerts(a => a.filter(x => x.id !== id))
    else setError('Could not update the review suggestion. Please try again.')
  }
  if (!alerts.length) return error ? <p role="alert" className="text-destructive">{error}</p> : null
  return <details className="mb-4" open>
    <summary className="engineering-review-heading">Engineering review suggestions ({alerts.length})</summary>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="mt-2 space-y-3 text-xs">
      {alerts.map(a => <div key={a.id} className="border-t border-border pt-2">
        <p><SeverityBadge severity={a.severity} /> <strong className="text-ink">{a.title}</strong></p>
        <p>{a.summary}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => void setStatus(a.id, 'reviewed')}>Mark reviewed</Button>
          <Button size="sm" variant="ghost" onClick={() => void setStatus(a.id, 'resolved')}>Resolve</Button>
          <Button size="sm" variant="ghost" onClick={() => void setStatus(a.id, 'dismissed')}>Dismiss</Button>
        </div>
      </div>)}
    </div>
  </details>
}
