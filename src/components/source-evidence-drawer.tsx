import { useState } from 'react'
import { Badge, Button, Icon, SourcesDrawer } from '@/design-system/footprint-0a8b1a'
import { supabase } from '@/integrations/supabase/client'
import type { EngineeringClaim, EngineeringSource } from '@/lib/engineering-data'
import { useNavigate } from '@tanstack/react-router'
import type { Passage } from '@/lib/quote-locate'
import { confidenceLabel } from '@/lib/claim-confidence'
import { truncationNotices } from '@/lib/truncation'

export function ClaimEvidence({ claim, onSource, location }: { claim: EngineeringClaim; onSource?: () => void; location?: string | null }) {
  return <div className="engineering-evidence">
    <div className="flex flex-wrap items-center gap-2"><Badge variant="reference">{claim.type}</Badge><Badge variant="reference">{claim.status}</Badge><Badge variant="reference">Confidence: {confidenceLabel(claim.confidence)} ({Math.round(claim.confidence * 100)}%)</Badge>{location && <Badge variant="reference">{location}</Badge>}</div>
    <p><strong>{claim.subject}</strong> · {claim.attribute}</p>
    <p>{claim.value}{claim.unit ? ` ${claim.unit}` : ''}</p>
    {claim.evidence_excerpt && <blockquote className="text-muted-foreground">“{claim.evidence_excerpt}”</blockquote>}
    {onSource && <Button variant="ghost" size="sm" onClick={onSource}><Icon name="FileText" /> Supporting source</Button>}
  </div>
}
export function SourceEvidenceDrawer({ source, claims, quote, location, passage, onClose }: { source: EngineeringSource | null; claims: EngineeringClaim[]; quote?: string; location?: string | null; passage?: Passage | null; onClose: () => void }) {
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const visibleClaims = claims.filter(c => `${c.subject} ${c.attribute} ${c.value} ${c.evidence_excerpt}`.toLowerCase().includes(search.toLowerCase()))
  const openFile = async () => {
    if (!source?.file_path) return
    setError('')
    const { data, error: failure } = await supabase.storage.from('sources').createSignedUrl(source.file_path, 60)
    if (failure || !data) { setError('Could not open the original file.'); return }
    const a = document.createElement('a'); a.href = data.signedUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click()
  }
  return <SourcesDrawer open={!!source} onClose={() => { setSearch(''); setError(''); onClose() }} onSearch={setSearch} onAddSource={() => { onClose(); void navigate({ to: '/app', search: { sources: true } }) }}>
    {source && <div className="space-y-4">
      <h2 className="font-heading text-h2">{source.title}</h2>
      <Badge variant={source.status === 'ready' || source.status === 'indexed' ? 'indexed' : 'reference'}>{source.status}</Badge>
      {truncationNotices(source.metadata).map(n => <p key={n} role="note" className="text-sm text-destructive">{n}</p>)}
      {location && <p className="text-sm text-muted-foreground">Found on <strong>{location}</strong></p>}
      {passage
        ? <p className="whitespace-pre-wrap engineering-passage">{passage.before}<mark>{passage.match}</mark>{passage.after}</p>
        : quote && <blockquote className="engineering-evidence">“{quote}”</blockquote>}
      {source.engineering_summary && <p>{source.engineering_summary}</p>}
      {passage ? null : source.content_snippet ? <p className="whitespace-pre-wrap">{source.content_snippet}</p> : <p className="text-muted-foreground">No extracted text is available yet.</p>}
      {source.url && <a className="site-link" href={source.url} target="_blank" rel="noreferrer">Open original link ↗</a>}
      {source.file_path && <Button variant="quiet" onClick={() => void openFile()}><Icon name="ArrowUpRight" /> Open original file</Button>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {visibleClaims.map(c => <ClaimEvidence key={c.id} claim={c} />)}
      {search && visibleClaims.length === 0 && <p className="text-muted-foreground">No matching engineering claims.</p>}
    </div>}
  </SourcesDrawer>
}