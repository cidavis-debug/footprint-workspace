import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import type { Json } from '@/integrations/supabase/types'
import { diffClaims, type AlertRef } from './claim-diff'
import { conflictHints, rankCandidates } from './claim-match'
import { geminiEndpoint, geminiModel } from './gemini-model'
import { analysisTruncation, MAX_ANALYSIS_CHARS, MAX_ANALYSIS_CLAIMS, type AnalysisTruncation } from './truncation'

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
const extractSchema = z.object({ summary: z.string().max(2000), claims: z.array(z.unknown()) })
const alertSchema = z.object({
  new_index: z.number().int(),
  related_claim_id: z.string().nullable().optional(),
  alert_type: z.enum(ALERT_TYPES),
  severity: z.enum(['low', 'medium', 'high']).catch('medium'),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(1500),
  affected_systems: z.array(z.string()).max(20).default([]),
})

/** Existing claims fetched per analysis, and how many of the most related ones are shown to the reviewer. */
const MAX_EXISTING = 1000
const MAX_CANDIDATES = 80

const S = (props: Record<string, unknown>, required: string[]) => ({ type: 'OBJECT', properties: props, required })
const STR = { type: 'STRING' }
const STRS = { type: 'ARRAY', items: STR }

async function gemini(key: string, prompt: string, schema: unknown): Promise<unknown> {
  const res = await fetch(geminiEndpoint(geminiModel()), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema } }),
  })
  if (!res.ok) { console.error('Gemini analysis error', res.status, await res.text()); throw new Error(`Gemini ${res.status}`) }
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  return JSON.parse(json.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '')
}

export type SourceChangeSummary = { changed: number; added: number; removed: number; raised: number; cleared: number; from: number; to: number }
export type AnalyzeResult = { status: 'complete' | 'failed' | 'skipped'; claims: number; alerts: number; error: string | null; compared?: number; proposed?: number; change?: SourceChangeSummary; truncation?: AnalysisTruncation }

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
/** Models sometimes wrap or prefix the id they were shown ("{uuid}", "id=uuid"); pull out the bare uuid. */
const bareId = (v: string | null | undefined) => UUID.exec(v ?? '')?.[0]?.toLowerCase() ?? null

export const analyzeEngineeringSource = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ sourceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<AnalyzeResult> => {
    const { supabase } = context
    const key = process.env['GEMINI_API_KEY']
    if (!key) return { status: 'failed', claims: 0, alerts: 0, error: 'AI is not configured.' }

    // RLS: only returns the row if the caller owns its workspace.
    const { data: src } = await supabase.from('sources').select('id, workspace_id, title, content_snippet, content_text, metadata, engineering_analysis_status').eq('id', data.sourceId).maybeSingle()
    if (!src) return { status: 'failed', claims: 0, alerts: 0, error: 'Source not found.' }
    const text = src.content_text || src.content_snippet
    if (!text?.trim()) return { status: 'skipped', claims: 0, alerts: 0, error: 'This source has no extracted text yet.' }

    // Content fingerprint of the text being analyzed. A different fingerprint than the last analysis means the source really changed.
    const meta = src.metadata && typeof src.metadata === 'object' && !Array.isArray(src.metadata) ? src.metadata as Record<string, unknown> : {}
    const newHash = await sha256Hex(text)
    const prevHash = typeof meta['analyzed_hash'] === 'string' ? meta['analyzed_hash'] : null
    const prevVersion = typeof meta['analysis_version'] === 'number' && meta['analysis_version'] >= 1 ? meta['analysis_version'] : 1
    const startedPending = src.engineering_analysis_status === 'pending'

    await supabase.from('sources').update({ engineering_analysis_status: 'processing' }).eq('id', src.id)
    try {
      const extracted = extractSchema.parse(await gemini(key,
        `You extract engineering context from one document so it can later be compared with other documents.\nReturn a concise summary (max 3 sentences) and only material engineering claims: interfaces, requirements, decisions, constraints, assumptions. Skip vague, promotional, or non-engineering statements. Return an empty claims list if there are none. Return at most ${MAX_ANALYSIS_CLAIMS} claims, keeping the most material.\nAlso capture hardware/configuration data as claims: part numbers, revisions, BOM quantities, tolerances, and ECO/ECN references (type "requirement", "decision" or "constraint" as fits). Use the part or assembly as the subject, named the same way everywhere (e.g. "Motor driver", not a row number), and one property per claim as the attribute: "part number", "revision", "quantity per assembly", "tolerance", or "change order" (value is the ECO/ECN id, e.g. "ECN-0042"). Keep part numbers and revisions exactly as written (value "B" for revision B), and put units such as "mm" in unit.\nFor each claim:\n- subject: the specific component, system, or interface, named the way an engineer would name it in any document (e.g. "Main power bus", "CAN bus", "Operating temperature"). Use the same wording for the same thing throughout. Put requirement ids (e.g. R-101) in the evidence, not the subject.\n- attribute: the single property being specified (e.g. "nominal voltage", "bit rate", "ambient range"). Split compound statements into separate claims.\n- value and unit: the number and its unit separately (value "24", unit "V"; value "500", unit "kbit/s"). For ranges use value "-20 to 60" with unit "°C". For non-numeric values (e.g. "IP54") leave unit empty.\n- status: "approved" only when the text says approved, baselined, or released, or states a binding "shall" requirement in an approved document; "proposed" for proposals and open decisions; "preferred" when one option is preferred; "superseded" when the text says it is replaced; otherwise "unknown". Things stated as assumed are type "assumption".\n- evidence_excerpt: one exact, contiguous quote copied from the text (no paraphrase, no location markers), long enough to show the value.\n- confidence: 0-1.\nThe text contains location markers such as [Page 2], [Slide 3] and [Sheet: BOM]; they are not content.\n\nTITLE: ${src.title}\n\nTEXT:\n${text.slice(0, MAX_ANALYSIS_CHARS)}`,
        S({ summary: STR, claims: { type: 'ARRAY', items: S({ type: { type: 'STRING', enum: [...CLAIM_TYPES] }, subject: STR, attribute: STR, value: STR, unit: { type: 'STRING', nullable: true }, affected_systems: STRS, status: { type: 'STRING', enum: [...CLAIM_STATUS] }, evidence_excerpt: STR, confidence: { type: 'NUMBER' } }, ['type', 'subject', 'attribute', 'value', 'affected_systems', 'status', 'evidence_excerpt', 'confidence']) } }, ['summary', 'claims'])))
      const parsedClaims = extracted.claims.flatMap(c => { const r = claimSchema.safeParse(c); return r.success ? [r.data] : [] })
      const truncation = analysisTruncation(text.length, parsedClaims.length)
      const claims = parsedClaims.slice(0, MAX_ANALYSIS_CLAIMS)

      // Snapshot the previous claims (and the open alerts that depend on them) so a changed source can be diffed.
      const { data: oldClaims } = await supabase.from('engineering_claims').select('id, type, subject, attribute, value, unit, status').eq('source_id', src.id)
      const before = oldClaims ?? []
      const contentChanged = prevHash ? prevHash !== newHash : startedPending && before.length > 0
      let clearedAlerts: AlertRef[] = []
      if (contentChanged && before.length) {
        const ids = before.map(c => c.id).join(',')
        const { data: oldAlerts } = await supabase.from('engineering_alerts').select('title, severity').eq('workspace_id', src.workspace_id).eq('status', 'open').or(`new_claim_id.in.(${ids}),related_claim_id.in.(${ids})`)
        clearedAlerts = oldAlerts ?? []
      }

      // Reanalysis replaces this source's previous claims (alerts cascade).
      await supabase.from('engineering_claims').delete().eq('source_id', src.id)
      const { data: inserted, error: insErr } = claims.length
        ? await supabase.from('engineering_claims').insert(claims.map(c => ({ ...c, unit: c.unit ?? null, workspace_id: src.workspace_id, source_id: src.id }))).select('id, type, subject, attribute, value, unit, status, affected_systems, evidence_excerpt')
        : { data: [], error: null }
      if (insErr) throw new Error(insErr.message)
      const newClaims = inserted ?? []

      let alertCount = 0, compared = 0, proposed = 0
      const raised: AlertRef[] = []
      if (newClaims.length) {
        const { data: others, error: othersErr } = await supabase.from('engineering_claims')
          .select('id, type, subject, attribute, value, unit, affected_systems, evidence_excerpt, sources(title)')
          .eq('workspace_id', src.workspace_id).neq('source_id', src.id).neq('status', 'superseded').limit(MAX_EXISTING)
        if (othersErr) throw new Error(othersErr.message)
        // Compare against the claims most related to the new ones, not an arbitrary slice, plus leads from a numeric check.
        const existing = rankCandidates(newClaims, others ?? [], MAX_CANDIDATES)
        compared = existing.length
        const hints = conflictHints(newClaims, existing)
        const fmt = (c: { type: string; subject: string; attribute: string; value: string; unit: string | null; affected_systems: string[]; evidence_excerpt: string }) =>
          `${c.type} | ${c.subject} | ${c.attribute} = ${c.value}${c.unit ? ' ' + c.unit : ''} | systems: ${c.affected_systems.join(', ') || '-'} | evidence: "${c.evidence_excerpt}"`
        const raw = await gemini(key,
          `You are an engineering reviewer. Compare NEW claims with EXISTING claims from other sources in the same workspace and decide which pairs deserve a review alert.\nRaise an alert when a NEW claim and an EXISTING claim describe the same subject, attribute, interface, or affected system and their values are incompatible: interface_mismatch (interfaces or protocols disagree), changed_constraint (a limit or requirement differs from an earlier one), possible_conflict (any other incompatibility). Treat numbers as equal when they differ only in unit notation (1000 kbit/s = 1 Mbit/s). Do not alert for wording differences, compatible values, or claims about different components that merely share an attribute name (for example the voltage of two different motors).\nAlso flag a NEW assumption as unsupported_assumption (related_claim_id null) only when it is a material planning or engineering assumption and no EXISTING claim supports it. If an EXISTING claim contradicts the assumption, use possible_conflict with that claim instead.\nSeverity: high = an approved claim conflicts with another claim on power, safety, interfaces, or another core design parameter, or the mismatch would break integration; medium = a conflict involving proposed or preferred claims, or a changed limit; low = minor mismatches and weak assumptions.\nWhen evidence is genuinely weak, prefer no alert. Use cautious wording ("Possible conflict", "May affect", "Consider reviewing", "Supporting evidence was not found"). Titles are short and name the subject and both values. Summaries cite both evidence excerpts and name both sources.\n\nNEW (use the index as new_index):\n${newClaims.map((c, i) => `[${i}] ${fmt(c)}`).join('\n')}\n\nLIKELY NUMERIC MISMATCHES (found by a deterministic check; verify each and alert only if it is a real conflict):\n${hints.map(h => `NEW [${h.newIndex}] vs id=${h.related.id}: ${h.detail}`).join('\n') || '(none)'}\n\nEXISTING (set related_claim_id to the exact uuid after id=, without the "id=" prefix):\n${existing.map(c => `id=${c.id} [${(c.sources as { title: string } | null)?.title ?? 'source'}] ${fmt(c)}`).join('\n') || '(none)'}`,
          S({ alerts: { type: 'ARRAY', items: S({ new_index: { type: 'INTEGER' }, related_claim_id: { type: 'STRING', nullable: true }, alert_type: { type: 'STRING', enum: [...ALERT_TYPES] }, severity: { type: 'STRING', enum: ['low', 'medium', 'high'] }, title: STR, summary: STR, affected_systems: STRS }, ['new_index', 'alert_type', 'severity', 'title', 'summary', 'affected_systems']) } }, ['alerts']))
        const ids = new Set(existing.map(c => c.id))
        const seen = new Set<string>()
        const skipped = { invalid: 0, badIndex: 0, badRelatedId: 0, notAssumption: 0, duplicate: 0, insertFailed: 0 }
        const proposals = z.object({ alerts: z.array(z.unknown()) }).parse(raw).alerts
        proposed = proposals.length
        for (const a of proposals) {
          const r = alertSchema.safeParse(a); if (!r.success) { skipped.invalid++; continue }
          const nc = newClaims[r.data.new_index]; if (!nc) { skipped.badIndex++; continue }
          const relatedId = bareId(r.data.related_claim_id)
          const related = r.data.alert_type === 'unsupported_assumption' ? null : (relatedId && ids.has(relatedId) ? relatedId : undefined)
          if (related === undefined) { skipped.badRelatedId++; continue } // conflicts must link to a real claim
          if (r.data.alert_type === 'unsupported_assumption' && nc.type !== 'assumption') { skipped.notAssumption++; continue }
          const k = `${nc.id}|${related}|${r.data.alert_type}`; if (seen.has(k)) { skipped.duplicate++; continue } seen.add(k)
          const { error } = await supabase.from('engineering_alerts').insert({ workspace_id: src.workspace_id, new_claim_id: nc.id, related_claim_id: related, alert_type: r.data.alert_type, severity: r.data.severity, title: r.data.title, summary: r.data.summary, affected_systems: r.data.affected_systems })
          if (error) { skipped.insertFailed++; console.error('Alert insert failed', error.message) } else { alertCount++; raised.push({ title: r.data.title, severity: r.data.severity }) }
        }
        console.warn(`Engineering analysis "${src.title}": ${newClaims.length} new claims vs ${existing.length} existing; model proposed ${proposed}, saved ${alertCount}`, skipped)
      }
      const analysisVersion = contentChanged ? prevVersion + 1 : prevVersion
      let change: SourceChangeSummary | undefined
      if (contentChanged) {
        const diff = { ...diffClaims(before, newClaims), alerts_raised: raised, alerts_cleared: clearedAlerts }
        const { error: changeErr } = await supabase.from('source_changes').insert({ workspace_id: src.workspace_id, source_id: src.id, source_title: src.title, version_from: prevVersion, version_to: analysisVersion, diff: diff as unknown as Json })
        if (changeErr) console.error('Saving source change failed (is the source_changes migration applied?)', changeErr.message)
        change = { changed: diff.changed.length, added: diff.added.length, removed: diff.removed.length, raised: raised.length, cleared: clearedAlerts.length, from: prevVersion, to: analysisVersion }
      }
      await supabase.from('sources').update({ engineering_analysis_status: 'complete', engineering_summary: extracted.summary, metadata: { ...Object.fromEntries(Object.entries(meta).filter(([k]) => k !== 'analysis_truncation')), analyzed_hash: newHash, analysis_version: analysisVersion, ...(truncation ? { analysis_truncation: truncation } : {}) } as Json }).eq('id', src.id)
      return { status: 'complete', claims: newClaims.length, alerts: alertCount, error: null, compared, proposed, ...(change ? { change } : {}), ...(truncation ? { truncation } : {}) }
    } catch (e) {
      console.error('Engineering analysis failed', e)
      await supabase.from('sources').update({ engineering_analysis_status: 'failed' }).eq('id', src.id)
      return { status: 'failed', claims: 0, alerts: 0, error: 'Analysis failed. The source is still available — try again.' }
    }
  })
