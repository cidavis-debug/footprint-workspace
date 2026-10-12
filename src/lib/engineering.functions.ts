import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const CLAIM_TYPES = ['interface', 'requirement', 'decision', 'constraint', 'assumption'] as const
const CLAIM_STATUS = ['proposed', 'preferred', 'approved', 'superseded', 'unknown'] as const
const ALERT_TYPES = ['possible_conflict', 'changed_constraint', 'interface_mismatch', 'unsupported_assumption'] as const

const claimSchema = z.object({
  type: z.enum(CLAIM_TYPES),
  subject: z.string().trim().min(1).max(200),
  attribute: z.string().trim().min(1).max(200),
  value: z.string().trim().min(1).max(1000),
  unit: z.string().trim().max(50).nullable().optional(),
  affected_systems: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  status: z.enum(CLAIM_STATUS).catch('unknown'),
  evidence_excerpt: z.string().trim().max(1000).default(''),
  confidence: z.number().min(0).max(1).catch(0.5),
})
const extractSchema = z.object({ summary: z.string().max(2000), claims: z.array(z.unknown()).max(40) })
const alertSchema = z.object({
  new_index: z.number().int(),
  related_claim_id: z.string().nullable().optional(),
  alert_type: z.enum(ALERT_TYPES),
  severity: z.enum(['low', 'medium', 'high']).catch('medium'),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(1500),
  affected_systems: z.array(z.string()).max(20).default([]),
})

const S = (props: Record<string, unknown>, required: string[]) => ({ type: 'OBJECT', properties: props, required })
const STR = { type: 'STRING' }
const STRS = { type: 'ARRAY', items: STR }

async function gemini(key: string, prompt: string, schema: unknown): Promise<unknown> {
  const model = process.env['GEMINI_MODEL'] || 'gemini-3.8-flash'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema } }),
  })
  if (!res.ok) { console.error('Gemini analysis error', res.status, await res.text()); throw new Error(`Gemini ${res.status}`) }
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  return JSON.parse(json.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '')
}

export type AnalyzeResult = { status: 'complete' | 'failed' | 'skipped'; claims: number; alerts: number; error: string | null }

export const analyzeEngineeringSource = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ sourceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<AnalyzeResult> => {
    const { supabase } = context
    const key = process.env['GEMINI_API_KEY']
    if (!key) return { status: 'failed', claims: 0, alerts: 0, error: 'AI is not configured.' }

    // RLS: only returns the row if the caller owns its workspace.
    const { data: src } = await supabase.from('sources').select('id, workspace_id, title, content_snippet').eq('id', data.sourceId).maybeSingle()
    if (!src) return { status: 'failed', claims: 0, alerts: 0, error: 'Source not found.' }
    if (!src.content_snippet?.trim()) return { status: 'skipped', claims: 0, alerts: 0, error: 'This source has no extracted text yet.' }

    await supabase.from('sources').update({ engineering_analysis_status: 'processing' }).eq('id', src.id)
    try {
      const extracted = extractSchema.parse(await gemini(key,
        `You extract engineering context from a document. Return a concise summary (max 3 sentences) and only material engineering claims (interfaces, requirements, decisions, constraints, assumptions). evidence_excerpt must be an exact quote from the text. confidence is 0-1. Skip vague or non-engineering statements. Return an empty list if none.\n\nTITLE: ${src.title}\n\nTEXT:\n${src.content_snippet.slice(0, 20000)}`,
        S({ summary: STR, claims: { type: 'ARRAY', items: S({ type: { type: 'STRING', enum: [...CLAIM_TYPES] }, subject: STR, attribute: STR, value: STR, unit: { type: 'STRING', nullable: true }, affected_systems: STRS, status: { type: 'STRING', enum: [...CLAIM_STATUS] }, evidence_excerpt: STR, confidence: { type: 'NUMBER' } }, ['type', 'subject', 'attribute', 'value', 'affected_systems', 'status', 'evidence_excerpt', 'confidence']) } }, ['summary', 'claims'])))
      const claims = extracted.claims.flatMap(c => { const r = claimSchema.safeParse(c); return r.success ? [r.data] : [] })

      // Reanalysis replaces this source's previous claims (alerts cascade).
      await supabase.from('engineering_claims').delete().eq('source_id', src.id)
      const { data: inserted, error: insErr } = claims.length
        ? await supabase.from('engineering_claims').insert(claims.map(c => ({ ...c, unit: c.unit ?? null, workspace_id: src.workspace_id, source_id: src.id }))).select('id, type, subject, attribute, value, unit, affected_systems, evidence_excerpt')
        : { data: [], error: null }
      if (insErr) throw new Error(insErr.message)
      const newClaims = inserted ?? []

      let alertCount = 0
      if (newClaims.length) {
        const { data: others } = await supabase.from('engineering_claims')
          .select('id, type, subject, attribute, value, unit, affected_systems, evidence_excerpt, sources(title)')
          .eq('workspace_id', src.workspace_id).neq('source_id', src.id).neq('status', 'superseded').limit(200)
        const existing = others ?? []
        const fmt = (c: { type: string; subject: string; attribute: string; value: string; unit: string | null; affected_systems: string[]; evidence_excerpt: string }) =>
          `${c.type} | ${c.subject} | ${c.attribute} = ${c.value}${c.unit ? ' ' + c.unit : ''} | systems: ${c.affected_systems.join(', ') || '-'} | evidence: "${c.evidence_excerpt}"`
        const raw = await gemini(key,
          `You are an engineering reviewer. Compare NEW claims with EXISTING claims from other sources in the same workspace. Suggest review alerts only when there is a meaningful match in subject, attribute, interface, or affected system AND the values are genuinely incompatible (interface_mismatch, possible_conflict, changed_constraint). Do not alert for wording differences or compatible values. Also flag a NEW assumption as unsupported_assumption (related_claim_id null) only if it is a material planning/engineering assumption with no supporting evidence among existing claims. Prefer no alert when evidence is weak. Use cautious wording: "Possible conflict", "May affect", "Consider reviewing", "Supporting evidence was not found". Summaries should cite both evidence excerpts.\n\nNEW (use the index as new_index):\n${newClaims.map((c, i) => `[${i}] ${fmt(c)}`).join('\n')}\n\nEXISTING (use id as related_claim_id):\n${existing.map(c => `{${c.id}} [${(c.sources as { title: string } | null)?.title ?? 'source'}] ${fmt(c)}`).join('\n') || '(none)'}`,
          S({ alerts: { type: 'ARRAY', items: S({ new_index: { type: 'INTEGER' }, related_claim_id: { type: 'STRING', nullable: true }, alert_type: { type: 'STRING', enum: [...ALERT_TYPES] }, severity: { type: 'STRING', enum: ['low', 'medium', 'high'] }, title: STR, summary: STR, affected_systems: STRS }, ['new_index', 'alert_type', 'severity', 'title', 'summary', 'affected_systems']) } }, ['alerts']))
        const ids = new Set(existing.map(c => c.id))
        const seen = new Set<string>()
        for (const a of z.object({ alerts: z.array(z.unknown()) }).parse(raw).alerts) {
          const r = alertSchema.safeParse(a); if (!r.success) continue
          const nc = newClaims[r.data.new_index]; if (!nc) continue
          const related = r.data.alert_type === 'unsupported_assumption' ? null : (r.data.related_claim_id && ids.has(r.data.related_claim_id) ? r.data.related_claim_id : undefined)
          if (related === undefined) continue // conflicts must link to a real claim
          if (r.data.alert_type === 'unsupported_assumption' && nc.type !== 'assumption') continue
          const k = `${nc.id}|${related}|${r.data.alert_type}`; if (seen.has(k)) continue; seen.add(k)
          const { error } = await supabase.from('engineering_alerts').insert({ workspace_id: src.workspace_id, new_claim_id: nc.id, related_claim_id: related, alert_type: r.data.alert_type, severity: r.data.severity, title: r.data.title, summary: r.data.summary, affected_systems: r.data.affected_systems })
          if (!error) alertCount++
        }
      }
      await supabase.from('sources').update({ engineering_analysis_status: 'complete', engineering_summary: extracted.summary }).eq('id', src.id)
      return { status: 'complete', claims: newClaims.length, alerts: alertCount, error: null }
    } catch (e) {
      console.error('Engineering analysis failed', e)
      await supabase.from('sources').update({ engineering_analysis_status: 'failed' }).eq('id', src.id)
      return { status: 'failed', claims: 0, alerts: 0, error: 'Analysis failed. The source is still available — try again.' }
    }
  })
