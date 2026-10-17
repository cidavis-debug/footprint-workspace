import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { fetchPage, FetchPageError } from './fetch-page'

const MAX_TEXT_CHARS = 200_000

export type LinkFetchResult = { status: 'ready' | 'failed'; error: string | null; changed: boolean; chars: number; title: string | null }

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

/** Downloads a saved link's page, stores its readable text on the source, and reports whether the content changed since the last fetch. */
export const fetchLinkContent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ sourceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<LinkFetchResult> => {
    const { supabase } = context
    const fail = (error: string): LinkFetchResult => ({ status: 'failed', error, changed: false, chars: 0, title: null })
    // RLS: only returns the row if the caller owns its workspace.
    const { data: src } = await supabase.from('sources').select('id, source_type, url, title, metadata').eq('id', data.sourceId).maybeSingle()
    if (!src || src.source_type !== 'link' || !src.url) return fail('Link not found.')
    const oldMeta = src.metadata && typeof src.metadata === 'object' && !Array.isArray(src.metadata) ? src.metadata : {}
    try {
      const page = await fetchPage(src.url)
      const text = page.text.length > MAX_TEXT_CHARS ? page.text.slice(0, MAX_TEXT_CHARS) : page.text
      const hash = await sha256Hex(text)
      const changed = (oldMeta as { content_hash?: unknown }).content_hash !== hash
      const { error } = await supabase.from('sources').update({
        status: 'ready', error_message: null, content_text: text, content_snippet: text.slice(0, 2000),
        ...(page.title ? { title: page.title.slice(0, 200) } : {}),
        ...(changed ? { engineering_analysis_status: 'pending', engineering_summary: null } : {}),
        metadata: { ...oldMeta, content_hash: hash, fetched_at: new Date().toISOString(), final_url: page.finalUrl, ...(page.truncated || page.text.length > MAX_TEXT_CHARS ? { truncated: true } : {}) },
      }).eq('id', src.id)
      if (error) { console.error('Link save failed', error.message); return fail('Fetched the page but could not save it.') }
      return { status: 'ready', error: null, changed, chars: text.length, title: page.title }
    } catch (e) {
      const message = e instanceof FetchPageError ? e.message : 'Could not read this page.'
      if (!(e instanceof FetchPageError)) console.error('Link fetch failed', e)
      await supabase.from('sources').update({ status: 'error', error_message: message }).eq('id', src.id)
      return fail(message)
    }
  })
