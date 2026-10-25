import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { findQuote, locateQuote, type Passage } from './quote-locate'
import { geminiEndpoint, geminiModel } from './gemini-model'
import { engineeringPrompt, sourceText, type EngineeringAlert, type EngineeringClaim, type EngineeringSource } from './engineering-data'

export type Citation = { id: string; title: string; kind: 'file' | 'link'; url: string | null; quote: string; location?: string | null; passage?: Passage | null }
export type AskResult = { answer: string; citations: Citation[]; error: string | null; conversationId?: string | null; historyError?: string }

export const askFootprint = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workspaceId: z.string().uuid(), question: z.string().trim().min(1).max(2000), conversationId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }): Promise<AskResult> => {
    const key = process.env['GEMINI_API_KEY']
    if (!key) return { answer: '', citations: [], error: 'AI is not configured.' }
    const { supabase } = context

    const list: EngineeringSource[] = [], claims: EngineeringClaim[] = [], alerts: EngineeringAlert[] = []
    for (let offset = 0; ; offset += 1000) {
      const [s, c, a] = await Promise.all([
        supabase.from('sources').select('id, title, source_type, url, file_path, content_snippet, content_text, status, engineering_analysis_status, engineering_summary').eq('workspace_id', data.workspaceId).order('id').range(offset, offset + 999),
        supabase.from('engineering_claims').select('*').eq('workspace_id', data.workspaceId).order('id').range(offset, offset + 999),
        supabase.from('engineering_alerts').select('*').eq('workspace_id', data.workspaceId).eq('status', 'open').order('id').range(offset, offset + 999),
      ])
      if (s.error || c.error || a.error) return { answer: '', citations: [], error: 'Could not load engineering context.' }
      list.push(...s.data); claims.push(...c.data); alerts.push(...a.data)
      if (s.data.length < 1000 && c.data.length < 1000 && a.data.length < 1000) break
    }
    if (list.length === 0) return { answer: '', citations: [], error: 'Add a source to this workspace first.' }

    const prompt = engineeringPrompt(list, claims, alerts, data.question)

    const res = await fetch(geminiEndpoint(geminiModel()), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              answer: { type: 'STRING' },
              citations: { type: 'ARRAY', items: { type: 'OBJECT', properties: { tag: { type: 'STRING' }, quote: { type: 'STRING' } }, required: ['tag', 'quote'] } },
            },
            required: ['answer', 'citations'],
          },
        },
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      console.error('Gemini error', res.status, detail)
      const msg = res.status === 429 ? 'Gemini rate limit reached. Try again shortly.' : res.status === 400 || res.status === 403 ? 'Gemini rejected the request — check your API key.' : res.status === 404 ? 'Gemini could not find the answer model — its name needs updating.' : 'Gemini is unavailable right now.'
      return { answer: '', citations: [], error: msg }
    }
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    let parsed: { answer: string; citations: { tag: string; quote: string }[] }
    try { parsed = z.object({ answer: z.string().min(1), citations: z.array(z.object({ tag: z.string().regex(/^S[1-9]\d*$/), quote: z.string() })) }).parse(JSON.parse(text)) } catch { return { answer: '', citations: [], error: 'Gemini returned no answer.' } }

    const seen = new Set<string>()
    const citations: Citation[] = []
    for (const c of parsed.citations ?? []) {
      const s = list[Number(c.tag.replace(/\D/g, '')) - 1]
      if (!s || seen.has(s.id)) continue
      seen.add(s.id)
      const text = sourceText(s)
      const quote = (text && findQuote(text, c.quote)) || claims.some(claim => claim.source_id === s.id && claim.evidence_excerpt.includes(c.quote)) ? c.quote : ''
      const located = quote ? locateQuote(text, quote) : null
      citations.push({ id: s.id, title: s.title, kind: s.source_type === 'link' || s.source_type === 'url' ? 'link' : 'file', url: s.url, quote, location: located?.location ?? null, passage: located?.passage ?? null })
    }
    // Include every inline source reference even when the model omits it from its citation array.
    for (const match of parsed.answer.matchAll(/\[S(\d+)\]/g)) {
      const s = list[Number(match[1]) - 1]
      if (!s || seen.has(s.id)) continue
      seen.add(s.id)
      citations.push({ id: s.id, title: s.title, kind: s.source_type === 'file' ? 'file' : 'link', url: s.url, quote: '' })
    }
    const answer = parsed.answer.replace(/\s*\[?S\d+\]?(,\s*\[?S\d+\]?)*/g, (m) => m.replace(/S(\d+)/g, (_, n) => list[Number(n) - 1]?.title ?? `S${n}`))

    // Continue an existing conversation in this workspace (RLS + workspace filter), otherwise start a new one.
    let conversationId: string | null = null, historyError: string | undefined
    if (data.conversationId) {
      const { data: existing } = await supabase.from('conversations').select('id').eq('id', data.conversationId).eq('workspace_id', data.workspaceId).maybeSingle()
      conversationId = existing?.id ?? null
    }
    if (!conversationId) {
      const { data: convo, error: convoErr } = await supabase.from('conversations').insert({ workspace_id: data.workspaceId, title: data.question.slice(0, 80) }).select('id').single()
      conversationId = convo?.id ?? null
      if (convoErr) { console.error('Save conversation failed', convoErr.message); historyError = convoErr.message }
    }
    if (conversationId) {
      const { error } = await supabase.from('messages').insert([
        { conversation_id: conversationId, role: 'user', content: data.question, citations: [] },
        { conversation_id: conversationId, role: 'assistant', content: answer, citations },
      ])
      if (error) { console.error('Save messages failed', error.message); historyError = error.message }
      else await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
    }
    return { answer, citations, error: null, conversationId, ...(historyError ? { historyError } : {}) }
  })
