import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import type { EngineeringAlert, EngineeringClaim, EngineeringSource } from './engineering-data'

export const getRadar = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ workspaceId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: workspaces, error } = await context.supabase.from('workspaces').select('id, name, parent_id').order('created_at')
    if (error) throw new Error('Could not load workspaces.')
    const workspaceId = data.workspaceId ?? workspaces?.[0]?.id
    if (!workspaceId) return { workspaces: workspaces ?? [], workspaceId: '', alerts: [] as EngineeringAlert[], claims: [] as EngineeringClaim[], sources: [] as EngineeringSource[] }
    if (!workspaces?.some(w => w.id === workspaceId)) throw new Error('Workspace unavailable.')
    const alerts: EngineeringAlert[] = [], claims: EngineeringClaim[] = [], sources: EngineeringSource[] = []
    for (let offset = 0; ; offset += 1000) {
      const [a, c, s] = await Promise.all([
        context.supabase.from('engineering_alerts').select('*').eq('workspace_id', workspaceId).order('id').range(offset, offset + 999),
        context.supabase.from('engineering_claims').select('*').eq('workspace_id', workspaceId).order('id').range(offset, offset + 999),
        context.supabase.from('sources').select('id, title, source_type, url, file_path, content_snippet, status, engineering_analysis_status, engineering_summary').eq('workspace_id', workspaceId).order('id').range(offset, offset + 999),
      ])
      if (a.error || c.error || s.error) throw new Error('Could not load engineering context.')
      alerts.push(...a.data); claims.push(...c.data); sources.push(...s.data)
      if (a.data.length < 1000 && c.data.length < 1000 && s.data.length < 1000) break
    }
    return { workspaces, workspaceId, alerts, claims, sources }
  })

export const reviewRadarAlert = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ id: z.string().uuid(), workspaceId: z.string().uuid(), status: z.enum(['reviewed', 'resolved', 'dismissed']) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from('engineering_alerts').update({ status: data.status }).eq('id', data.id).eq('workspace_id', data.workspaceId).select('id').maybeSingle()
    if (error || !row) throw new Error('Could not update this alert.')
    return { id: row.id, status: data.status }
  })