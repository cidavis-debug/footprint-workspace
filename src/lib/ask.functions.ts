import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export type Citation = { id: string; title: string; kind: 'file' | 'link'; url: string | null; quote: string }
export type AskResult = { answer: string; citations: Citation[]; error: string | null }

export const askFootprint = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workspaceId: z.string().uuid(), question: z.string().trim().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }): Promise<AskResult> => {
    const key = process.env['GEMINI_API_KEY']
    if (!key) return { answer: '', citations: [], error: 'AI is not configured.' }
    const { supabase } = context

    const { data: sources, error: srcErr } = await supabase
      .from('sources')
      .select('id, title, source_type, url, content_snippet, status')
      .eq('workspace_id', data.workspaceId)
      .limit(40)
    if (srcErr) return { answer: '', citations: [], error: 'Could not load sources.' }
    const list = sources ?? []
    if (list.length === 0) return { answer: '', citations: [], error: 'Add a source to this workspace first.' }

    const context_ = list.map((s, i) => `[S${i + 1}] ${s.title}${s.url ? ` (${s.url})` : ''}\n${s.content_snippet ?? '(No extracted text yet — title/link only.)'}`).join('\n\n')
    const prompt = `You are Footprint, a careful research assistant. Answer the question using ONLY the sources below. If they don't contain the answer, say so plainly. Cite sources by their tags (e.g. S1).\n\nSOURCES:\n${context_}\n\nQUESTION: ${data.question}`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`, {
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
    try { parsed = JSON.parse(text) } catch { return { answer: '', citations: [], error: 'Gemini returned no answer.' } }

    const seen = new Set<string>()
    const citations: Citation[] = []
    for (const c of parsed.citations ?? []) {
      const s = list[Number(c.tag.replace(/\D/g, '')) - 1]
      if (!s || seen.has(s.id)) continue
      seen.add(s.id)
      citations.push({ id: s.id, title: s.title, kind: s.source_type === 'link' || s.source_type === 'url' ? 'link' : 'file', url: s.url, quote: c.quote })
    }
    const answer = parsed.answer.replace(/\s*\[?S\d+\]?(,\s*\[?S\d+\]?)*/g, (m) => m.replace(/S(\d+)/g, (_, n) => list[Number(n) - 1]?.title ?? `S${n}`))

    const { data: convo } = await supabase.from('conversations').insert({ workspace_id: data.workspaceId, title: data.question.slice(0, 80) }).select('id').single()
    if (convo) {
      const { error } = await supabase.from('messages').insert([
        { conversation_id: convo.id, role: 'user', content: data.question },
        { conversation_id: convo.id, role: 'assistant', content: answer, citations },
      ])
      if (error) console.error('Save messages failed', error.message)
    }
    return { answer, citations, error: null }
  })
