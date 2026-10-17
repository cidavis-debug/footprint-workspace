import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { anchorTerm, escapeLike, MAX_QUERY_CHARS, MIN_QUERY_CHARS, searchText, type TextHit } from './source-search'

export type SourceSearchGroup = { sourceId: string; title: string; kind: 'file' | 'link'; url: string | null; total: number; hits: TextHit[] }
export type SourceSearchResult = { groups: SourceSearchGroup[]; sourcesMatched: number; truncated: boolean; error: string | null }

const MAX_SOURCES = 50
const MAX_GROUPS = 25

/** Exact phrase search inside the stored text of every source in a workspace. No AI involved. */
export const searchSources = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ workspaceId: z.string().uuid(), query: z.string().trim().min(MIN_QUERY_CHARS).max(MAX_QUERY_CHARS) }).parse(d))
  .handler(async ({ data, context }): Promise<SourceSearchResult> => {
    // The database narrows to documents containing the longest word; the exact phrase is then checked here.
    const { data: rows, error } = await context.supabase.from('sources')
      .select('id, title, source_type, url, content_text')
      .eq('workspace_id', data.workspaceId)
      .ilike('content_text', `%${escapeLike(anchorTerm(data.query))}%`)
      .limit(MAX_SOURCES)
    if (error) { console.error('Source search failed', error.message); return { groups: [], sourcesMatched: 0, truncated: false, error: 'Search failed. Please try again.' } }
    const groups = (rows ?? []).flatMap((r): SourceSearchGroup[] => {
      const { total, hits } = searchText(r.content_text ?? '', data.query)
      return total > 0 ? [{ sourceId: r.id, title: r.title, kind: r.source_type === 'file' ? 'file' : 'link', url: r.url, total, hits }] : []
    }).sort((a, b) => b.total - a.total || a.title.localeCompare(b.title))
    return { groups: groups.slice(0, MAX_GROUPS), sourcesMatched: groups.length, truncated: (rows?.length ?? 0) >= MAX_SOURCES || groups.length > MAX_GROUPS, error: null }
  })
