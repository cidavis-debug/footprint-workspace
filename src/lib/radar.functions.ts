import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import type { EngineeringAlert, EngineeringClaim, EngineeringSource } from './engineering-data'
import { readDiff, type SourceChangeRow } from './claim-diff'
import { locateQuote } from './quote-locate'

export const getRadar = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ workspaceId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: workspaces, error } = await context.supabase.from('workspaces').select('id, name, parent_id').order('created_at')
    if (error) throw new Error('Could not load workspaces.')
    const workspaceId = data.workspaceId ?? workspaces?.[0]?.id
    if (!workspaceId) return { workspaces: workspaces ?? [], workspaceId: '', alerts: [] as EngineeringAlert[], claims: [] as EngineeringClaim[], sources: [] as EngineeringSource[], changes: [] as SourceChangeRow[], locations: {} as Record<string, string> }
    if (!workspaces?.some(w => w.id === workspaceId)) throw new Error('Workspace unavailable.')
    const alerts: EngineeringAlert[] = [], claims: EngineeringClaim[] = [], sources: EngineeringSource[] = []
    for (let offset = 0; ; offset += 1000) {
      const [a, c, s] = await Promise.all([
        context.supabase.from('engineering_alerts').select('*').eq('workspace_id', workspaceId).order('id').range(offset, offset + 999),
        context.supabase.from('engineering_claims').select('*').eq('workspace_id', workspaceId).order('id').range(offset, offset + 999),
        context.supabase.from('sources').select('id, title, source_type, url, file_path, content_snippet, status, engineering_analysis_status, engineering_summary, updated_at, metadata').eq('workspace_id', workspaceId).order('id').range(offset, offset + 999),
      ])
      if (a.error || c.error || s.error) throw new Error('Could not load engineering context.')
      alerts.push(...a.data); claims.push(...c.data); sources.push(...s.data)
      if (a.data.length < 1000 && c.data.length < 1000 && s.data.length < 1000) break
    }
    // Recent source changes; Radar still loads if the source_changes table has not been created yet.
    const { data: changeRows, error: changeErr } = await context.supabase.from('source_changes').select('id, source_id, source_title, version_from, version_to, created_at, diff').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(20)
    if (changeErr) console.error('Could not load source changes', changeErr.message)
    const changes: SourceChangeRow[] = (changeRows ?? []).map(r => ({ ...r, diff: readDiff(r.diff) }))
    // Page/slide/sheet for the claims behind current alerts (bounded: only those claims' sources are read).
    const locations: Record<string, string> = {}
    const wanted = new Set(alerts.filter(a => a.status !== 'dismissed').flatMap(a => [a.new_claim_id, a.related_claim_id ?? '']))
    const shown = claims.filter(c => wanted.has(c.id) && c.evidence_excerpt)
    const sourceIds = [...new Set(shown.map(c => c.source_id))]
    if (sourceIds.length) {
      const { data: texts } = await context.supabase.from('sources').select('id, content_text').in('id', sourceIds)
      const byId = new Map((texts ?? []).map(t => [t.id, t.content_text]))
      for (const c of shown) { const loc = locateQuote(byId.get(c.source_id), c.evidence_excerpt)?.location; if (loc) locations[c.id] = loc }
    }
    return { workspaces, workspaceId, alerts, claims, sources, changes, locations }
  })

export const reviewRadarAlert = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ id: z.string().uuid(), workspaceId: z.string().uuid(), status: z.enum(['reviewed', 'resolved', 'dismissed']) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from('engineering_alerts').update({ status: data.status }).eq('id', data.id).eq('workspace_id', data.workspaceId).select('id').maybeSingle()
    if (error || !row) throw new Error('Could not update this alert.')
    return { id: row.id, status: data.status }
  })