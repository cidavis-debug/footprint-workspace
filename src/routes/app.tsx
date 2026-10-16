import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input } from '@/design-system/apple-inspired-bec754'
import { ArrowUp, Copy, FilePlus2, FileText, Link2, Paperclip, Search, Sparkles, Square, X } from 'lucide-react'
import { entryReady } from '@/components/app/entry'
import { askFootprint, type Citation } from '@/lib/ask.functions'
import { analyzeEngineeringSource } from '@/lib/engineering.functions'
import { EngineeringAlerts, SourceEngineering } from '@/components/engineering-context'
import { pageHead } from '@/components/page-head'
import { type WorkspaceNode } from '@/components/workspace-picker'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/integrations/supabase/client'
import { SourceEvidenceDrawer } from '@/components/source-evidence-drawer'
import { getRadar } from '@/lib/radar.functions'
import { suggestedQuestions, type EngineeringClaim, type EngineeringSource } from '@/lib/engineering-data'

type Workspace = WorkspaceNode
type Collection = { id: string; name: string; description: string | null }
type Source = { id: string; title: string; source_type: string; status: string; collection_id: string | null; engineering_analysis_status: string; engineering_summary: string | null }

export const Route = createFileRoute('/app')({ ssr: false, validateSearch: (s: Record<string, unknown>): { workspace?: string; sources?: boolean } => ({ ...(typeof s['workspace'] === 'string' ? { workspace: s['workspace'] } : {}), ...(s['sources'] === true ? { sources: true } : {}) }), head: () => pageHead('Workspace — Footprint', 'A focused workspace for questions, documents, and shared team knowledge.'), component: Workspace })

function sourceStatus(status: string): 'indexed' | 'processing' | 'reference' {
  if (status === 'ready' || status === 'indexed') return 'indexed'
  if (status === 'error') return 'reference'
  return 'processing'
}

function Workspace() {
  const { workspace: requestedWorkspace, sources: requestedSources } = Route.useSearch()
  const { user, loading, signOut } = useAuth()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  useEffect(() => { if (requestedSources) setSourcesOpen(true) }, [requestedSources])
  const [notice, setNotice] = useState('')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState('')
  const [collections, setCollections] = useState<Collection[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [collectionName, setCollectionName] = useState('')
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
  const currentWorkspace = useRef(activeWorkspace)
  const mainRef = useRef<HTMLElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dock = dockRef.current, main = mainRef.current
    if (!dock || !main) return
    const ro = new ResizeObserver(() => main.style.setProperty('--dock-height', `${dock.offsetHeight}px`))
    ro.observe(dock)
    return () => ro.disconnect()
  })
  currentWorkspace.current = activeWorkspace
  const lastTurn = useRef<HTMLElement>(null)
  useEffect(() => { if (!loading) entryReady() }, [loading])
  useEffect(() => { if (thread.length) lastTurn.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }) }, [thread.length])
  useEffect(() => { setThread([]); setEvidence(null) }, [activeWorkspace])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setDataLoading(true)
    void (async () => {
      const { data: ws } = await supabase.from('workspaces').select('id, name, parent_id').order('created_at')
      if (cancelled) return
      const list = ws ?? []
      setWorkspaces(list)
      const first = list[0]?.id ?? ''
      setActiveWorkspace(current => list.some(w => w.id === requestedWorkspace) ? requestedWorkspace ?? first : current || first)
      setDataLoading(false)
    })()
    return () => { cancelled = true }
  }, [user, requestedWorkspace])

  useEffect(() => {
    if (!activeWorkspace) { setCollections([]); setSources([]); return }
    let cancelled = false
    void (async () => {
      const [{ data: cols }, { data: srcs }] = await Promise.all([
        supabase.from('collections').select('id, name, description').eq('workspace_id', activeWorkspace).order('created_at'),
        supabase.from('sources').select('id, title, source_type, status, collection_id, engineering_analysis_status, engineering_summary').eq('workspace_id', activeWorkspace).order('created_at'),
      ])
      if (cancelled) return
      setCollections(cols ?? [])
      setCollectionName(cols?.[0]?.name ?? '')
      setSources(srcs ?? [])
    })()
    return () => { cancelled = true }
  }, [activeWorkspace])

  const visibleSources = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? sources.filter(s => s.title.toLowerCase().includes(query)) : sources
  }, [sources, search])

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
  const collectionId = collections[0]?.id ?? null
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

  const uploadFile = async (file: File) => {
    const ok = /\.(pdf|md|markdown|txt)$/i.test(file.name)
    if (!ok) { setNotice('Only PDF, Markdown, and text files are supported.'); return }
    if (file.size > 20 * 1024 * 1024) { setNotice('Files must be 20 MB or smaller.'); return }
    setBusy(true); setNotice(`Uploading “${file.name}”…`)
    const path = `${activeWorkspace}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error: upErr } = await supabase.storage.from('sources').upload(path, file, { contentType: file.type || undefined })
    if (upErr) { setBusy(false); setNotice(`Upload failed: ${upErr.message}`); return }
    const isText = !/\.pdf$/i.test(file.name)
    const snippet = isText ? (await file.text()).slice(0, 2000) : null
    const { data, error } = await supabase.from('sources').insert({ workspace_id: activeWorkspace, collection_id: collectionId, title: file.name, source_type: 'file', file_path: path, status: isText ? 'ready' : 'indexing', content_snippet: snippet, metadata: { size: file.size, mime: file.type } }).select('id, title, source_type, status, collection_id, engineering_analysis_status, engineering_summary').single()
    setBusy(false)
    if (error) { await supabase.storage.from('sources').remove([path]); setNotice(`Could not save source: ${error.message}`); return }
    setSources(s => [...s, data]); setNotice(`Added “${file.name}”.`)
    if (isText) void analyze(data.id)
  }

  const addLink = async () => {
    let url: URL
    try { url = new URL(linkUrl.trim()); if (!/^https?:$/.test(url.protocol)) throw new Error() } catch { setNotice('Enter a valid http(s) link.'); return }
    setBusy(true)
    const { data, error } = await supabase.from('sources').insert({ workspace_id: activeWorkspace, collection_id: collectionId, title: url.hostname + url.pathname.replace(/\/$/, ''), source_type: 'link', url: url.toString(), status: 'ready' }).select('id, title, source_type, status, collection_id, engineering_analysis_status, engineering_summary').single()
    setBusy(false)
    if (error) { setNotice(`Could not add link: ${error.message}`); return }
    setSources(s => [...s, data]); setLinkUrl(''); setLinkOpen(false); setNotice('Link added.')
  }

  const removeSource = async (src: Source) => {
    if (!window.confirm(`Remove “${src.title}”?`)) return
    const { data: row } = await supabase.from('sources').select('file_path').eq('id', src.id).single()
    const { error } = await supabase.from('sources').delete().eq('id', src.id)
    if (error) { setNotice(`Could not remove: ${error.message}`); return }
    if (row?.file_path) await supabase.storage.from('sources').remove([row.file_path])
    setSources(s => s.filter(x => x.id !== src.id)); setNotice(`Removed “${src.title}”.`)
  }

  const renameCollection = async () => {
    const name = collectionName.trim()
    if (!collectionId || !name) return
    const { error } = await supabase.from('collections').update({ name }).eq('id', collectionId)
    if (error) { setNotice(`Could not rename: ${error.message}`); return }
    setCollections(c => c.map(x => x.id === collectionId ? { ...x, name } : x)); setNotice('Collection renamed.')
  }

  const openUpload = () => fileInput.current?.click()
  const openLink = () => { setLinkOpen(true); setSourcesOpen(true) }

  const createWorkspace = async (name: string, parentId: string | null) => {
    if (!user) return
    setBusy(true)
    const { data, error } = await supabase.from('workspaces').insert({ owner_id: user.id, name, parent_id: parentId }).select('id, name, parent_id').single()
    setBusy(false)
    if (error) { setNotice(`Could not create workspace: ${error.message}`); return }
    setWorkspaces(w => [...w, data])
    setActiveWorkspace(data.id)
    setNotice(`Workspace “${name}” created.`)
  }

  const statusLine = dataLoading ? 'Loading your workspace…' : workspaces.length > 0 ? `Answering from “${workspaces.find(w => w.id === activeWorkspace)?.name ?? 'Personal'}” sources.` : 'No workspace found for this account.'
  const sourcesPanel = <aside className="ax-glass ax-sources" aria-label="Sources">
    <div className="ax-panel-head"><h2>Sources</h2><span className="ax-count lp-mono">{sources.length}</span><button type="button" className="ax-iconbtn ax-close" aria-label="Close sources" onClick={() => setSourcesOpen(false)}><X size={16} aria-hidden="true" /></button></div>
    <label className="ax-search"><Search size={15} aria-hidden="true" /><input aria-label="Search sources" placeholder="Search sources" value={search} onChange={e => setSearch(e.target.value)} /></label>
    <div className="ax-actions">
      <button type="button" onClick={openUpload} disabled={busy}><FilePlus2 size={15} aria-hidden="true" /> Upload file</button>
      <button type="button" onClick={() => setLinkOpen(o => !o)} aria-expanded={linkOpen}><Link2 size={15} aria-hidden="true" /> Add link</button>
    </div>
    {linkOpen && <form className="ax-inline" onSubmit={e => { e.preventDefault(); void addLink() }}>
      <Input aria-label="Link URL" type="url" placeholder="https://…" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} autoFocus />
      <Button type="submit" size="sm" loading={busy}>Add</Button>
    </form>}
    {collectionId && <form className="ax-inline ax-collection" onSubmit={e => { e.preventDefault(); void renameCollection() }}>
      <span className="lp-mono">Collection</span>
      <Input aria-label="Collection name" value={collectionName} onChange={e => setCollectionName(e.target.value)} />
      <Button type="submit" variant="ghost" size="sm">Rename</Button>
    </form>}
    {notice && sourcesOpen && <p role="status" className="ax-note">{notice}</p>}
    <div className="ax-analyze"><button type="button" onClick={() => void analyzeExisting()} disabled={!!bulk}><Sparkles size={15} aria-hidden="true" /> Analyze existing sources</button>{bulk && <span role="status" className="lp-mono">{bulk}</span>}</div>
    <EngineeringAlerts workspaceId={activeWorkspace} refreshKey={alertKey} />
    {focusSource && <p className="ax-note">Cited source: <strong>{focusSource}</strong></p>}
    <ul className="ax-src-list">
      {visibleSources.length > 0
        ? visibleSources.map(src => <li key={src.id} className="ax-src">
            <div className="ax-src-row">
              <span className="ax-src-icon">{src.source_type === 'link' || src.source_type === 'url' ? <Link2 size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}</span>
              <div className="ax-src-main"><b title={src.title}>{src.title}</b><span className="lp-mono"><i data-status={sourceStatus(src.status)} aria-hidden="true" />{src.source_type === 'link' || src.source_type === 'url' ? 'Link' : 'File'} · {statusLabel(sourceStatus(src.status))}</span></div>
              <button type="button" className="ax-iconbtn" aria-label={`Remove ${src.title}`} title="Remove source" onClick={() => void removeSource(src)}><X size={15} aria-hidden="true" /></button>
            </div>
            {src.status === 'ready' && <SourceEngineering sourceId={src.id} status={src.engineering_analysis_status} summary={src.engineering_summary} busy={analyzing === src.id} onReanalyze={() => void analyze(src.id)} />}
          </li>)
        : <li className="ax-empty"><b>{sources.length > 0 ? 'No matches.' : 'No sources yet.'}</b><span>{sources.length > 0 ? 'Try a different search.' : `Your “${collections[0]?.name ?? 'General'}” collection is ready — upload a file or add a link.`}</span></li>}
    </ul>
  </aside>

  return <AppShell workspaces={workspaces} value={activeWorkspace} onChange={setActiveWorkspace} onCreate={createWorkspace} busy={busy} mode="ask" email={user.email ?? null} onSources={() => setSourcesOpen(o => !o)} onSignOut={signOut} right={sourcesPanel} rightOpen={sourcesOpen} onRightClose={() => setSourcesOpen(false)}>
    <main className="ax-chat" ref={mainRef}>
      <div className="ax-scroll">
        <div className="ax-column">
          {thread.length === 0 && <div className="ax-empty-chat">
            <p className="lp-mono ax-kicker">Ask mode</p>
            <h1>What’s on your mind?</h1>
            <p>Ask about the sources in this workspace. Answers cite what they used.</p>
            <ul className="ax-starters">{suggestedQuestions.map(q => <li key={q}><button type="button" onClick={() => void ask(q)} disabled={asking || !activeWorkspace}>{q}<ArrowUp size={15} aria-hidden="true" /></button></li>)}</ul>
          </div>}
          {thread.map((m, i) => <article key={i} className="ax-turn" ref={i === thread.length - 1 ? lastTurn : undefined} aria-label={`Question ${i + 1}`}>
            <header className="ax-q"><span className="ax-who lp-mono"><i aria-hidden="true" />You</span><h2>{m.question}</h2></header>
            <div className="ax-a">
              <span className="ax-who lp-mono ax-who-ai">Footprint</span>
              {m.pending
                ? <p role="status" className="ax-pending">Reading your sources…</p>
                : <>
                    <div className="ax-prose">{m.answer.split(/\n{2,}/).map((para, k) => <p key={k}>{para}</p>)}</div>
                    {m.citations.length > 0 && <div className="ax-cites" aria-label="Sources cited">
                      {m.citations.map((c, n) => <button type="button" key={c.id} className="ax-cite" title={c.quote || c.title} onClick={() => void openEvidence(c)}><b className="lp-mono">{n + 1}</b>{c.kind === 'link' ? <Link2 size={13} aria-hidden="true" /> : <FileText size={13} aria-hidden="true" />}<span>{c.title}</span></button>)}
                    </div>}
                    <button type="button" className="ax-copy" onClick={() => void navigator.clipboard?.writeText(m.answer)}><Copy size={13} aria-hidden="true" /> Copy</button>
                  </>}
            </div>
          </article>)}
        </div>
      </div>
      <div className="ax-dock" ref={dockRef}>
        <div className="ax-column">
          {notice && <p className="ax-notice" role="status">{notice}</p>}
          <PromptBar onSend={q => void ask(q)} onUpload={openUpload} onAddLink={openLink} asking={asking} onStop={stop} placeholder={asking ? 'Thinking…' : 'Ask a question…'} />
          <p className="ax-hint lp-mono">{statusLine} <span>Shift + Enter for new line</span></p>
        </div>
      </div>
    </main>
    <input ref={fileInput} type="file" hidden accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadFile(f) }} />
    <SourceEvidenceDrawer source={evidence?.source ?? null} claims={evidence?.claims ?? []} quote={evidence?.quote} onClose={() => setEvidence(null)} />
  </AppShell>
}

function statusLabel(s: 'indexed' | 'processing' | 'reference') { return s === 'indexed' ? 'Indexed' : s === 'processing' ? 'Processing' : 'Reference' }

/** Matte prompt bar: Enter sends, Shift+Enter inserts a newline. Send turns into Stop while a request is running. */
function PromptBar({ onSend, onUpload, onAddLink, asking, onStop, placeholder }: { onSend: (q: string) => void; onUpload: () => void; onAddLink: () => void; asking: boolean; onStop: () => void; placeholder: string }) {
  const [value, setValue] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const submit = () => { const q = value.trim(); if (!q || asking) return; onSend(q); setValue('') }
  useEffect(() => { const el = area.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 180)}px` }, [value])
  return <form className="ax-composer" onSubmit={e => { e.preventDefault(); submit() }}>
    <button type="button" className="ax-iconbtn" aria-label="Upload a file" title="Upload a file" onClick={onUpload}><Paperclip size={18} aria-hidden="true" /></button>
    <button type="button" className="ax-iconbtn ax-link-btn" aria-label="Add a link" title="Add a link" onClick={onAddLink}><Link2 size={18} aria-hidden="true" /></button>
    <textarea ref={area} rows={1} aria-label="Ask your workspace" placeholder={placeholder} value={value} disabled={asking} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }} />
    {asking
      ? <button type="button" className="ax-send ax-stop" aria-label="Stop generating" title="Stop generating" onClick={onStop}><Square size={14} fill="currentColor" aria-hidden="true" /></button>
      : <button type="submit" className="ax-send" aria-label="Send question" title="Send question" disabled={!value.trim()}><ArrowUp size={18} aria-hidden="true" /></button>}
  </form>
}
