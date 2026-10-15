import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useRef, useState } from 'react'
import { Answer, Button, CitationChip, Composer, Icon, Input, SourceItem, SourcesDrawer } from '@/design-system/footprint-0a8b1a'
import { askFootprint, type Citation } from '@/lib/ask.functions'
import { analyzeEngineeringSource } from '@/lib/engineering.functions'
import { EngineeringAlerts, SourceEngineering } from '@/components/engineering-context'
import { pageHead } from '@/components/page-head'
import { Illustration } from '@/components/illustration'
import { useWorkspaces } from '@/features/workspace/use-workspaces'
import { sourceStatus, useSources } from '@/features/sources/use-sources'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/integrations/supabase/client'
import { SourceEvidenceDrawer } from '@/components/source-evidence-drawer'
import { getRadar } from '@/lib/radar.functions'
import { suggestedQuestions, type EngineeringClaim, type EngineeringSource } from '@/lib/engineering-data'

export const Route = createFileRoute('/app')({ ssr: false, validateSearch: (s: Record<string, unknown>): { workspace?: string; sources?: boolean } => ({ ...(typeof s['workspace'] === 'string' ? { workspace: s['workspace'] } : {}), ...(s['sources'] === true ? { sources: true } : {}) }), head: () => pageHead('Workspace — Footprint', 'A focused workspace for questions, documents, and shared team knowledge.'), component: Workspace })

function Workspace() {
  const { workspace: requestedWorkspace, sources: requestedSources } = Route.useSearch()
  const { user, loading, signOut } = useAuth()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  useEffect(() => { if (requestedSources) setSourcesOpen(true) }, [requestedSources])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const { workspaces, activeWorkspace, setActiveWorkspace, dataLoading, currentWorkspace, createWorkspace } = useWorkspaces({ user, requestedWorkspace, setNotice, setBusy })
  const { collections, sources, setSources, visibleSources, collectionId, collectionName, setCollectionName, setSearch, linkOpen, setLinkOpen, linkUrl, setLinkUrl, uploadFile, addLink, removeSource, renameCollection } = useSources({ activeWorkspace, setNotice, setBusy, onTextSourceAdded: id => void analyze(id) })
  const [thread, setThread] = useState<{ question: string; answer: string; citations: Citation[]; pending: boolean }[]>([])
  const [asking, setAsking] = useState(false)
  const [focusSource, setFocusSource] = useState<string | null>(null)
  const askFn = useServerFn(askFootprint)
  const analyzeFn = useServerFn(analyzeEngineeringSource)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [bulk, setBulk] = useState('')
  const [alertKey, setAlertKey] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const evidenceFn = useServerFn(getRadar)
  const [evidence, setEvidence] = useState<{ source: EngineeringSource; claims: EngineeringClaim[]; quote: string } | null>(null)
  const requestId = useRef(0)
  const mainRef = useRef<HTMLElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dock = dockRef.current, main = mainRef.current
    if (!dock || !main) return
    const ro = new ResizeObserver(() => main.style.setProperty('--dock-height', `${dock.offsetHeight}px`))
    ro.observe(dock)
    return () => ro.disconnect()
  })
  useEffect(() => { setThread([]); setEvidence(null) }, [activeWorkspace])

  if (loading) return <main className="site-width"><p className="workspace-status" role="status">Opening your workspace…</p></main>
  if (!user) return <Navigate to="/login" search={{ redirect: '/app' }} replace />

  const ask = async (question: string) => {
    if (!question.trim() || !activeWorkspace || asking) return
    setAsking(true); setNotice('')
    const askedWorkspace = activeWorkspace
    const run = ++requestId.current
    setThread(t => [...t, { question, answer: '', citations: [], pending: true }])
    try {
      const r = await askFn({ data: { workspaceId: activeWorkspace, question } })
      if (run !== requestId.current) return
      if (currentWorkspace.current !== askedWorkspace) { setAsking(false); return }
      if (r.error) { setNotice(r.error); setThread(t => t.slice(0, -1)) }
      else setThread(t => [...t.slice(0, -1), { question, answer: r.answer, citations: r.citations, pending: false }])
    } catch { if (run !== requestId.current) return; if (currentWorkspace.current === askedWorkspace) { setNotice('Something went wrong asking Footprint.'); setThread(t => t.slice(0, -1)) } }
    setAsking(false)
  }
  const stop = () => {
    requestId.current++
    setThread(t => t.map((m, i) => i === t.length - 1 && m.pending ? { ...m, pending: false, answer: 'Generation stopped.' } : m))
    setAsking(false)
  }
  const openEvidence = async (citation: Citation) => {
    const workspaceId = activeWorkspace
    try {
      const context = await evidenceFn({ data: { workspaceId } })
      if (currentWorkspace.current !== workspaceId) return
      const source = context.sources.find(s => s.id === citation.id)
      if (!source) { setNotice('This source is no longer available.'); return }
      setEvidence({ source, claims: context.claims.filter(c => c.source_id === source.id), quote: citation.quote })
    } catch { setNotice('Could not load supporting evidence. Please try again.') }
  }

  const analyze = async (id: string) => {
    setAnalyzing(id)
    setSources(s => s.map(x => x.id === id ? { ...x, engineering_analysis_status: 'processing' } : x))
    let status = 'failed'
    try { const r = await analyzeFn({ data: { sourceId: id } }); status = r.status === 'skipped' ? 'pending' : r.status; if (r.error) setNotice(r.error) } catch { setNotice('Analysis failed. The source is still available.') }
    const { data } = await supabase.from('sources').select('engineering_analysis_status, engineering_summary').eq('id', id).maybeSingle()
    setSources(s => s.map(x => x.id === id ? { ...x, engineering_analysis_status: data?.engineering_analysis_status ?? status, engineering_summary: data?.engineering_summary ?? x.engineering_summary } : x))
    setAnalyzing(null); setAlertKey(k => k + 1)
  }
  const analyzeExisting = async () => {
    const todo = sources.filter(s => s.status === 'ready' && s.engineering_analysis_status !== 'complete')
    if (!todo.length) { setNotice('All indexed sources are already analyzed.'); return }
    for (const [i, s] of todo.entries()) { setBulk(`Analyzing ${i + 1} of ${todo.length}…`); await analyze(s.id) }
    setBulk(''); setNotice(`Analyzed ${todo.length} source${todo.length === 1 ? '' : 's'}.`)
  }

  const openUpload = () => fileInput.current?.click()
  const openLink = () => { setLinkOpen(true); setSourcesOpen(true) }

  return <AppShell workspaces={workspaces} value={activeWorkspace} onChange={setActiveWorkspace} onCreate={createWorkspace} busy={busy} mode="ask" email={user.email ?? null} onSources={() => setSourcesOpen(true)} onSignOut={signOut}>
    <main className="chat-main" ref={mainRef}>
      <div className="chat-scroll">
        <div className="chat-column">
          {thread.length === 0 && <div className="chat-empty">
            <Illustration name="empty" eager />
            <h1>What’s on your mind?</h1>
            <p>A clear question. The right context. A place to think together.</p>
            <div className="starter-grid">{suggestedQuestions.map(q => <button type="button" key={q} className="starter-card" onClick={() => void ask(q)} disabled={asking || !activeWorkspace}>{q}</button>)}</div>
          </div>}
          {thread.length > 0 && <div className="w-full space-y-8 text-left">
            {thread.map((m, i) => <div key={i} className="space-y-4">
              <h2 className="font-heading text-h2 text-ink">{m.question}</h2>
              {m.pending
                ? <p role="status" className="text-muted-foreground">Reading your sources…</p>
                : <Answer copyText={m.answer} sources={m.citations.map(c => c.title)}>
                    <p className="whitespace-pre-wrap">{m.answer}</p>
                    {m.citations.length > 0 && <div className="mt-4 flex flex-wrap gap-2">
                      {m.citations.map(c => <CitationChip key={c.id} kind={c.kind} href="#evidence" title={c.quote} onClick={e => { e.preventDefault(); void openEvidence(c) }}>{c.title}</CitationChip>)}
                    </div>}
                  </Answer>}
            </div>)}
          </div>}
        </div>
      </div>
      <div className="chat-dock" ref={dockRef}>
        <div className="chat-column"><div className="chat-dock-card">
          {notice && <p className="chat-notice" role="status">{notice}</p>}
          <p className="workspace-status">{dataLoading ? 'Loading your workspace…' : workspaces.length > 0 ? `Answering from “${workspaces.find(w => w.id === activeWorkspace)?.name ?? 'Personal'}” sources.` : 'No workspace found for this account.'}</p>
          <div className="chat-composer-row">
            <Composer className="flex-1" onSend={q => void ask(q)} onUpload={openUpload} onAddLink={openLink} disabled={asking} placeholder={asking ? 'Thinking…' : 'Ask a question…'} />
            {asking && <Button variant="primary" size="icon" aria-label="Stop generating" title="Stop generating" onClick={stop}><Icon name="X" /></Button>}
          </div>
        </div></div>
      </div>
    </main>
    <input ref={fileInput} type="file" hidden accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadFile(f) }} />
    <SourcesDrawer open={sourcesOpen} onClose={() => { setSourcesOpen(false); setLinkOpen(false) }} onAddSource={openUpload} onSearch={setSearch}>
      {collectionId && <form className="mb-4 flex gap-2" onSubmit={e => { e.preventDefault(); void renameCollection() }}>
        <Input aria-label="Collection name" value={collectionName} onChange={e => setCollectionName(e.target.value)} />
        <Button type="submit" variant="quiet" size="sm">Rename</Button>
      </form>}
      <div className="mb-4 flex gap-2">
        <Button variant="ghost" size="sm" onClick={openUpload} disabled={busy}><Icon name="FilePlus2" /> Upload file</Button>
        <Button variant="ghost" size="sm" onClick={() => setLinkOpen(o => !o)}><Icon name="Link2" /> Add link</Button>
      </div>
      {linkOpen && <form className="mb-4 flex gap-2" onSubmit={e => { e.preventDefault(); void addLink() }}>
        <Input aria-label="Link URL" type="url" placeholder="https://…" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} autoFocus />
        <Button type="submit" size="sm" loading={busy}>Add</Button>
      </form>}
      {notice && sourcesOpen && <p role="status" className="mb-4">{notice}</p>}
      <div className="mb-4 flex items-center gap-2"><Button variant="quiet" size="sm" onClick={() => void analyzeExisting()} loading={!!bulk}><Icon name="Sparkles" /> Analyze existing sources</Button>{bulk && <span role="status" className="text-muted-foreground">{bulk}</span>}</div>
      <EngineeringAlerts workspaceId={activeWorkspace} refreshKey={alertKey} />
      {focusSource && <p className="mb-4 text-muted-foreground">Cited source: <strong className="text-ink">{focusSource}</strong></p>}
      {visibleSources.length > 0
        ? visibleSources.map(s => <div key={s.id}><SourceItem name={s.title} kind={s.source_type === 'link' || s.source_type === 'url' ? 'link' : 'file'} status={sourceStatus(s.status)} onAction={() => void removeSource(s)} />{s.status === 'ready' && <SourceEngineering sourceId={s.id} status={s.engineering_analysis_status} summary={s.engineering_summary} busy={analyzing === s.id} onReanalyze={() => void analyze(s.id)} />}</div>)
        : <div className="empty-sources"><h2>{sources.length > 0 ? 'No matches.' : 'No sources yet.'}</h2><p>{sources.length > 0 ? 'Try a different search.' : `Your “${collections[0]?.name ?? 'General'}” collection is ready — upload a file or add a link.`}</p></div>}
    </SourcesDrawer>
    <SourceEvidenceDrawer source={evidence?.source ?? null} claims={evidence?.claims ?? []} quote={evidence?.quote} onClose={() => setEvidence(null)} />
  </AppShell>
}
