import { useState } from 'react'
import { Badge, Button, Icon, SourcesDrawer } from '@/design-system/footprint-0a8b1a'
import { supabase } from '@/integrations/supabase/client'
import type { EngineeringClaim, EngineeringSource } from '@/lib/engineering-data'

export function ClaimEvidence({ claim, onSource }: { claim: EngineeringClaim; onSource?: () => void }) {
  return <div className="engineering-evidence">
    <div className="flex flex-wrap items-center gap-2"><Badge variant="reference">{claim.type}</Badge><Badge variant="reference">{claim.status}</Badge></div>
    <p><strong>{claim.subject}</strong> · {claim.attribute}</p>
    <p>{claim.value}{claim.unit ? ` ${claim.unit}` : ''}</p>
    {claim.evidence_excerpt && <blockquote className="text-muted-foreground">“{claim.evidence_excerpt}”</blockquote>}
    {onSource && <Button variant="ghost" size="sm" onClick={onSource}><Icon name="FileText" /> Supporting source</Button>}
  </div>
}
export function SourceEvidenceDrawer({ source, claims, quote, onClose }: { source: EngineeringSource | null; claims: EngineeringClaim[]; quote?: string; onClose: () => void }) {
  const [error, setError] = useState('')
  const openFile = async () => {
    if (!source?.file_path) return
    setError('')
    const { data, error: failure } = await supabase.storage.from('sources').createSignedUrl(source.file_path, 60)
    if (failure || !data) { setError('Could not open the original file.'); return }
    const a = document.createElement('a'); a.href = data.signedUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click()
  }
  return <SourcesDrawer open={!!source} onClose={onClose}>
    {source && <div className="space-y-4">
      <h2 className="font-heading text-section">{source.title}</h2>
      <Badge variant={source.status === 'ready' || source.status === 'indexed' ? 'indexed' : 'reference'}>{source.status}</Badge>
      {quote && <blockquote className="engineering-evidence">“{quote}”</blockquote>}
      {source.engineering_summary && <p>{source.engineering_summary}</p>}
      {source.content_snippet ? <p className="whitespace-pre-wrap">{source.content_snippet}</p> : <p className="text-muted-foreground">No extracted text is available yet.</p>}
      {source.url && <a className="site-link" href={source.url} target="_blank" rel="noreferrer">Open original link ↗</a>}
      {source.file_path && <Button variant="quiet" onClick={() => void openFile()}><Icon name="ArrowUpRight" /> Open original file</Button>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {claims.map(c => <ClaimEvidence key={c.id} claim={c} />)}
    </div>}
  </SourcesDrawer>
}