import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Answer, Button, CitationChip, Composer, Icon, Input, SourceItem, SourcesDrawer } from '@/design-system/footprint-0a8b1a'
import { askFootprint, type Citation } from '@/lib/ask.functions'
import { analyzeEngineeringSource } from '@/lib/engineering.functions'
import { EngineeringAlerts, SourceEngineering } from '@/components/engineering-context'
import { pageHead } from '@/components/page-head'
import { Brand } from '@/components/brand'
import { Illustration } from '@/components/illustration'
import { WorkspacePicker, type WorkspaceNode } from '@/components/workspace-picker'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/integrations/supabase/client'

type Workspace = WorkspaceNode
type Collection = { id: string; name: string; description: string | null }
type Source = { id: string; title: string; source_type: string; status: string; collection_id: string | null; engineering_analysis_status: string; engineering_summary: string | null }

export const Route = createFileRoute('/app')({ ssr: false, head: () => pageHead('Workspace — Footprint', 'A focused workspace for questions, documents, and shared team knowledge.'), component: Workspace })

function sourceStatus(status: string): 'indexed' | 'processing' | 'reference' {
  if (status === 'ready' || status === 'indexed') return 'indexed'
  if (status === 'error') return 'reference'
  return 'processing'
}

function Workspace() {
  const { user, loading, signOut } = useAuth()
  const [sourcesOpen, setSourcesOpen] = useState(false)
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
  useEffect(() => { setThread([]) }, [activeWorkspace])

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
      setActiveWorkspace(current => current || first)
      setDataLoading(false)
    })()
    return () => { cancelled = true }
  }, [user])

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
    setThread(t => [...t, { question, answer: '', citations: [], pending: true }])
    try {
      const r = await askFn({ data: { workspaceId: activeWorkspace, question } })
      if (r.error) { setNotice(r.error); setThread(t => t.slice(0, -1)) }
      else setThread(t => [...t.slice(0, -1), { question, answer: r.answer, citations: r.citations, pending: false }])
    } catch { setNotice('Something went wrong asking Footprint.'); setThread(t => t.slice(0, -1)) }
    setAsking(false)
  }
  const collectionId = collections[0]?.id ?? null

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

  return <main className="site-width">
    <header className="workspace-header">
      <Link to="/" className="wordmark"><Brand /></Link>
      <div className="workspace-actions">
        {workspaces.length > 0 && <WorkspacePicker workspaces={workspaces} value={activeWorkspace} onChange={setActiveWorkspace} onCreate={createWorkspace} busy={busy} />}
        <span className="demo-label">{user.email}</span>
        <Button variant="ghost" onClick={() => setSourcesOpen(true)}><Icon name="Folder" /> Sources</Button>
        <Button variant="quiet" onClick={signOut}>Log out</Button>
      </div>
    </header>
    <section className="workspace-main">
      {thread.length === 0 && <>
        <Illustration name="empty" eager />
        <p className="section-kicker">Your shared knowledge, in focus</p>
        <h1>What’s on your mind?</h1>
        <p>A clear question. The right context. A place to think together.</p>
      </>}
      {thread.length > 0 && <div className="w-full space-y-8 text-left">
        {thread.map((m, i) => <div key={i} className="space-y-4">
          <h2 className="font-heading text-section text-ink">{m.question}</h2>
          {m.pending
            ? <p role="status" className="text-muted-foreground">Reading your sources…</p>
            : <Answer copyText={m.answer} sources={m.citations.map(c => c.title)}>
                <p className="whitespace-pre-wrap">{m.answer}</p>
                {m.citations.length > 0 && <div className="mt-4 flex flex-wrap gap-2">
                  {m.citations.map(c => <CitationChip key={c.id} kind={c.kind} href={c.url ?? '#sources'} title={c.quote} target={c.url ? '_blank' : undefined} rel={c.url ? 'noreferrer' : undefined} onClick={e => { if (!c.url) { e.preventDefault(); setFocusSource(c.title); setSearch(''); setSourcesOpen(true) } }}>{c.title}</CitationChip>)}
                </div>}
              </Answer>}
        </div>)}
      </div>}
      <Composer onSend={q => void ask(q)} onUpload={openUpload} onAddLink={openLink} placeholder={asking ? 'Thinking…' : 'Ask a question…'} />
      {dataLoading
        ? <p className="workspace-status" role="status">Loading your workspace…</p>
        : <p className="workspace-status">{workspaces.length > 0 ? `Answering from “${workspaces.find(w => w.id === activeWorkspace)?.name ?? 'Personal'}” sources.` : 'No workspace found for this account.'}</p>}
      {notice && <p className="connection-notice" role="status">{notice}</p>}
    </section>
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
  </main>
}
