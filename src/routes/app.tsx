import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input } from '@/design-system/apple-inspired-bec754'
import { ArrowUp, ChevronRight, Copy, Ellipsis, Eye, FilePlus2, FileText, History, Link2, Paperclip, Plus, RotateCw, Search, SlidersHorizontal, Sparkles, SquarePen, Square, Trash2, X } from 'lucide-react'
import { entryReady } from '@/components/app/entry'
import { ACCEPT_ATTR, extractText, isSupported, ExtractError } from '@/lib/extract-text'
import { historyDate, pairMessages, type ConversationSummary } from '@/lib/conversation-history'
import { classifyUpload, sha256Hex, storedVersion } from '@/lib/upload-dedupe'
import { askFootprint, type Citation } from '@/lib/ask.functions'
import { analyzeEngineeringSource } from '@/lib/engineering.functions'
import { fetchLinkContent } from '@/lib/links.functions'
import { searchSources, type SourceSearchResult } from '@/lib/search.functions'
import { MIN_QUERY_CHARS } from '@/lib/source-search'
import { EngineeringAlerts, SourceEngineering } from '@/components/engineering-context'
import { pageHead } from '@/components/page-head'
import { type WorkspaceNode } from '@/components/workspace-picker'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/integrations/supabase/client'
import { SourceEvidenceDrawer } from '@/components/source-evidence-drawer'
import { SourcePreview } from '@/components/source-preview'
import { getRadar } from '@/lib/radar.functions'
import type { Passage } from '@/lib/quote-locate'
import { type EngineeringClaim, type EngineeringSource } from '@/lib/engineering-data'
import { canNest, MAX_WORKSPACE_DEPTH } from '@/lib/workspace-tree'

type Workspace = WorkspaceNode
type Collection = { id: string; name: string; description: string | null }
type Source = { id: string; title: string; source_type: string; status: string; collection_id: string | null; engineering_analysis_status: string; engineering_summary: string | null }

export const Route = createFileRoute('/app')({ ssr: false, validateSearch: (s: Record<string, unknown>): { workspace?: string; sources?: boolean } => ({ ...(typeof s['workspace'] === 'string' ? { workspace: s['workspace'] } : {}), ...(s['sources'] === true ? { sources: true } : {}) }), head: () => pageHead('Workspace — Footprint AI', 'Ask cited questions across every source in your shared team workspace, from Drive and Jira to Slack and your PLM.'), component: Workspace })

/** The analysis fingerprint and version must survive a file replacement so the next analysis can tell what changed. */
function keepAnalysisMeta(metadata: unknown) {
  const m = metadata && typeof metadata === 'object' ? metadata as Record<string, unknown> : {}
  return { ...(typeof m['analyzed_hash'] === 'string' ? { analyzed_hash: m['analyzed_hash'] } : {}), ...(typeof m['analysis_version'] === 'number' ? { analysis_version: m['analysis_version'] } : {}) }
}

function sourceStatus(status: string): 'indexed' | 'processing' | 'reference' {
  if (status === 'ready' || status === 'indexed') return 'indexed'
  if (status === 'error') return 'reference'
  return 'processing'
}

function Workspace() {
  const { workspace: requestedWorkspace, sources: requestedSources } = Route.useSearch()
  const { user, loading, signOut } = useAuth()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  useEffect(() => { if (requestedSources) { setSourcesOpen(true); setRightCollapsed(false) } }, [requestedSources])
  useEffect(() => {
    if (!menu) return
    const close = (e: Event) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !(e.target as HTMLElement).closest('.ax-menu, .ax-menu-trigger')) setMenu(null) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [menu])
  // Each notice gets a new id, so a repeated message replaces the old one visibly (the key remounts it) instead of looking unchanged.
  const [noticeState, setNoticeState] = useState({ text: '', id: 0 })
  const notice = noticeState.text
  const setNotice = (text: string) => setNoticeState(s => ({ text, id: s.id + 1 }))
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
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const searchFn = useServerFn(searchSources)
  const [textResults, setTextResults] = useState<SourceSearchResult | null>(null)
  const [searchingText, setSearchingText] = useState(false)
  const [focusSource, setFocusSource] = useState<string | null>(null)
  const askFn = useServerFn(askFootprint)
  const analyzeFn = useServerFn(analyzeEngineeringSource)
  const fetchLinkFn = useServerFn(fetchLinkContent)
  const [fetchingLink, setFetchingLink] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  // Links saved elsewhere (e.g. the browser extension) arrive as 'indexing' with no text; read them one at a time as soon as they show up.
  const autoFetched = useRef(new Set<string>())
  const linkQueue = useRef<Promise<unknown>>(Promise.resolve())
  const loadLinkRef = useRef<((id: string) => Promise<void>) | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [bulk, setBulk] = useState('')
  const [alertKey, setAlertKey] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const evidenceFn = useServerFn(getRadar)
  const [evidence, setEvidence] = useState<{ source: EngineeringSource; claims: EngineeringClaim[]; quote: string; location: string | null; passage: Passage | null } | null>(null)
  const requestId = useRef(0)
  const analysisQueue = useRef<Promise<unknown>>(Promise.resolve())
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
  useEffect(() => { setThread([]); setEvidence(null); setConversationId(null); setConversations([]); setTextResults(null); setPreviewId(null) }, [activeWorkspace])
  useEffect(() => {
    for (const s of sources) {
      if (s.source_type !== 'link' || s.status !== 'indexing' || autoFetched.current.has(s.id)) continue
      autoFetched.current.add(s.id)
      linkQueue.current = linkQueue.current.then(() => loadLinkRef.current?.(s.id)).catch(() => undefined)
    }
  }, [sources])
  // Search inside the text of every source (debounced); the box above still filters source names instantly.
  useEffect(() => {
    const q = search.trim()
    if (q.length < MIN_QUERY_CHARS || !activeWorkspace) { setTextResults(null); setSearchingText(false); return }
    let cancelled = false
    setSearchingText(true)
    const timer = setTimeout(() => {
      void searchFn({ data: { workspaceId: activeWorkspace, query: q } })
        .then(r => { if (!cancelled) setTextResults(r) })
        .catch(() => { if (!cancelled) setTextResults({ groups: [], sourcesMatched: 0, truncated: false, error: 'Search failed. Please try again.' }) })
        .finally(() => { if (!cancelled) setSearchingText(false) })
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [search, activeWorkspace])

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
      const r = await askFn({ data: { workspaceId: activeWorkspace, question, ...(conversationId ? { conversationId } : {}) } })
      if (run !== requestId.current) return
      if (currentWorkspace.current !== askedWorkspace) { setAsking(false); return }
      if (r.error) { setNotice(r.error); setThread(t => t.slice(0, -1)) }
      else { setThread(t => [...t.slice(0, -1), { question, answer: r.answer, citations: r.citations, pending: false }]); if (r.conversationId) setConversationId(r.conversationId); if (r.historyError) setNotice(`Answered, but it could not be saved to history: ${r.historyError}`) }
    } catch { if (run !== requestId.current) return; if (currentWorkspace.current === askedWorkspace) { setNotice('Something went wrong asking Footprint AI.'); setThread(t => t.slice(0, -1)) } }
    setAsking(false)
  }
  const stop = () => {
    requestId.current++
    setThread(t => t.map((m, i) => i === t.length - 1 && m.pending ? { ...m, pending: false, answer: 'Generation stopped.' } : m))
    setAsking(false)
  }
  const collectionId = collections[0]?.id ?? null
  const loadConversations = async () => {
    const workspaceId = activeWorkspace
    if (!workspaceId) return
    setHistoryLoading(true)
    const { data, error } = await supabase.from('conversations').select('id, title, updated_at').eq('workspace_id', workspaceId).order('updated_at', { ascending: false }).limit(50)
    if (currentWorkspace.current !== workspaceId) return
    setHistoryLoading(false)
    if (error) { setNotice('Could not load conversation history.'); return }
    setConversations(data ?? [])
  }
  const newChat = () => { requestId.current++; setAsking(false); setThread([]); setEvidence(null); setConversationId(null); setMenu(null) }
  const openConversation = async (id: string) => {
    const workspaceId = activeWorkspace
    setMenu(null)
    const { data, error } = await supabase.from('messages').select('role, content, citations, created_at').eq('conversation_id', id)
    if (currentWorkspace.current !== workspaceId) return
    if (error) { setNotice(`Could not open that conversation: ${error.message}`); return }
    const turns = pairMessages(data ?? [])
    if (turns.length === 0) { setNotice('That conversation has no saved messages, so there is nothing to show.'); return }
    requestId.current++; setAsking(false); setEvidence(null); setNotice('')
    setThread(turns); setConversationId(id)
  }
  const deleteConversation = async (id: string) => {
    if (!window.confirm('Delete this conversation?')) return
    const { error } = await supabase.from('conversations').delete().eq('id', id)
    if (error) { setNotice(`Could not delete: ${error.message}`); return }
    setConversations(c => c.filter(x => x.id !== id))
    if (id === conversationId) newChat()
  }
  const openEvidence = async (citation: Citation) => {
    const workspaceId = activeWorkspace
    try {
      const context = await evidenceFn({ data: { workspaceId } })
      if (currentWorkspace.current !== workspaceId) return
      const source = context.sources.find(s => s.id === citation.id)
      if (!source) { setNotice('This source is no longer available.'); return }
      setEvidence({ source, claims: context.claims.filter(c => c.source_id === source.id), quote: citation.quote, location: citation.location ?? null, passage: citation.passage ?? null })
    } catch { setNotice('Could not load supporting evidence. Please try again.') }
  }

  // One analysis at a time: each source is compared with the claims of every source analyzed before it, so uploading several files at once can't miss pairs.
  const analyze = (id: string) => {
    const run = analysisQueue.current.then(() => runAnalysis(id))
    analysisQueue.current = run.catch(() => undefined)
    return run
  }
  const runAnalysis = async (id: string) => {
    setAnalyzing(id)
    setSources(s => s.map(x => x.id === id ? { ...x, engineering_analysis_status: 'processing' } : x))
    let status = 'failed'
    try { const r = await analyzeFn({ data: { sourceId: id } }); status = r.status === 'skipped' ? 'pending' : r.status; if (r.error) setNotice(r.error); else if (r.status === 'complete' && r.change) { const c = r.change, title = sources.find(x => x.id === id)?.title ?? 'source', parts = [c.changed && `${c.changed} value${c.changed === 1 ? '' : 's'} changed`, c.added && `${c.added} added`, c.removed && `${c.removed} removed`].filter(Boolean).join(', ') || 'no engineering claims changed'; setNotice(`“${title}” updated (v${c.from} → v${c.to}): ${parts}. ${c.raised} new alert${c.raised === 1 ? '' : 's'}, ${c.cleared} cleared. See Radar for details.`) }
      else if (r.status === 'complete') { const title = sources.find(x => x.id === id)?.title ?? 'source'; setNotice(r.claims === 0 ? `Analyzed “${title}”: no engineering claims found.` : `Analyzed “${title}”: ${r.claims} claims, ${r.alerts} alert${r.alerts === 1 ? '' : 's'}${r.compared ? ` (compared with ${r.compared} claims from other sources)` : ''}.`) } } catch { setNotice('Analysis failed. The source is still available.') }
    const { data } = await supabase.from('sources').select('engineering_analysis_status, engineering_summary').eq('id', id).maybeSingle()
    setSources(s => s.map(x => x.id === id ? { ...x, engineering_analysis_status: data?.engineering_analysis_status ?? status, engineering_summary: data?.engineering_summary ?? x.engineering_summary } : x))
    setAnalyzing(null); setAlertKey(k => k + 1)
  }
  const analyzeExisting = async (all = false) => {
    const todo = sources.filter(s => s.status === 'ready' && (all || s.engineering_analysis_status !== 'complete'))
    if (!todo.length) { setNotice('All indexed sources are already analyzed.'); return }
    for (const [i, s] of todo.entries()) { setBulk(`Analyzing ${i + 1} of ${todo.length}…`); await analyze(s.id) }
    setBulk(''); setNotice(`${all ? 'Re-checked' : 'Analyzed'} ${todo.length} source${todo.length === 1 ? '' : 's'}. Open Radar to review any conflicts.`)
  }

  const uploadFile = async (file: File) => {
    if (!isSupported(file.name)) { setNotice('Supported files: PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), Markdown, and text.'); return }
    if (file.size > 20 * 1024 * 1024) { setNotice('Files must be 20 MB or smaller.'); return }
    const workspaceId = activeWorkspace
    setBusy(true); setNotice(`Checking “${file.name}”…`)
    const hash = await sha256Hex(file)
    const { data: existingRows, error: existingErr } = await supabase.from('sources').select('id, title, metadata').eq('workspace_id', workspaceId).limit(1000)
    if (existingErr) { setBusy(false); setNotice('Could not check for existing copies. Please try again.'); return }
    const decision = classifyUpload(existingRows ?? [], file.name, hash)
    if (decision.kind === 'duplicate') { setBusy(false); setNotice(`“${file.name}” is already in this workspace (as “${decision.existing.title}”). Nothing was added.`); return }
    if (decision.kind === 'same-name' && !window.confirm(`“${decision.existing.title}” is already in this workspace, and this file is different.\n\nOK: replace it with this new version (its analysis will be re-run).\nCancel: don’t upload.`)) { setBusy(false); setNotice('Upload cancelled.'); return }
    setNotice(`Reading “${file.name}”…`)
    let extracted: { text: string; truncated: boolean; originalChars?: number }
    try { extracted = await extractText(file) } catch (e) { setBusy(false); setNotice(e instanceof ExtractError ? `“${file.name}”: ${e.message}` : 'Could not read this file.'); return }
    setNotice(`Uploading “${file.name}”…`)
    const path = `${workspaceId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error: upErr } = await supabase.storage.from('sources').upload(path, file, { contentType: file.type || undefined })
    if (upErr) { setBusy(false); setNotice(`Upload failed: ${upErr.message}`); return }
    const columns = 'id, title, source_type, status, collection_id, engineering_analysis_status, engineering_summary'
    const baseMeta = { size: file.size, mime: file.type, ...(hash ? { content_hash: hash } : {}), ...(extracted.truncated ? { truncated: true, ...(extracted.originalChars ? { original_chars: extracted.originalChars } : {}) } : {}) }
    const longNote = extracted.truncated ? ' (very long; only the first part is searchable)' : ''

    if (decision.kind === 'same-name') {
      const target = decision.existing
      const { data: old } = await supabase.from('sources').select('file_path').eq('id', target.id).maybeSingle()
      const version = storedVersion(target.metadata) + 1
      const { data, error } = await supabase.from('sources').update({ file_path: path, status: 'ready', error_message: null, content_snippet: extracted.text.slice(0, 2000), content_text: extracted.text, engineering_analysis_status: 'pending', engineering_summary: null, metadata: { ...baseMeta, ...keepAnalysisMeta(target.metadata), version, replaced_at: new Date().toISOString() } }).eq('id', target.id).select(columns).single()
      setBusy(false)
      if (error) { await supabase.storage.from('sources').remove([path]); setNotice(`Could not replace source: ${error.message}`); return }
      if (old?.file_path && old.file_path !== path) await supabase.storage.from('sources').remove([old.file_path])
      setSources(list => list.map(x => x.id === target.id ? data : x)); setNotice(`Replaced “${target.title}” with version ${version}${longNote}.`)
      void analyze(target.id)
      return
    }

    const { data, error } = await supabase.from('sources').insert({ workspace_id: workspaceId, collection_id: collectionId, title: file.name, source_type: 'file', file_path: path, status: 'ready', content_snippet: extracted.text.slice(0, 2000), content_text: extracted.text, metadata: { ...baseMeta, version: 1 } }).select(columns).single()
    setBusy(false)
    if (error) { await supabase.storage.from('sources').remove([path]); setNotice(`Could not save source: ${error.message}`); return }
    setSources(list => [...list, data]); setNotice(`Added “${file.name}”${longNote}.`)
    void analyze(data.id)
  }

  /** Downloads the page behind a saved link, stores its text, and analyzes it when new or changed. */
  const loadLink = async (id: string) => {
    autoFetched.current.add(id)
    setFetchingLink(id)
    setSources(list => list.map(x => x.id === id ? { ...x, status: 'indexing' } : x))
    let result: Awaited<ReturnType<typeof fetchLinkFn>>
    try { result = await fetchLinkFn({ data: { sourceId: id } }) } catch { result = { status: 'failed', error: 'Could not fetch the page. Please try again.', changed: false, chars: 0, title: null } }
    const { data } = await supabase.from('sources').select('id, title, source_type, status, collection_id, engineering_analysis_status, engineering_summary').eq('id', id).maybeSingle()
    if (data) setSources(list => list.map(x => x.id === id ? data : x))
    setFetchingLink(null)
    if (result.status !== 'ready') { setNotice(result.error ?? 'Could not read this page.'); return }
    setNotice(result.changed ? `Read “${data?.title ?? 'page'}” (${result.chars.toLocaleString()} characters).` : 'The page has not changed since it was last read.')
    if (result.changed || data?.engineering_analysis_status !== 'complete') void analyze(id)
  }

  loadLinkRef.current = loadLink

  const addLink = async () => {
    let url: URL
    try { url = new URL(linkUrl.trim()); if (!/^https?:$/.test(url.protocol)) throw new Error() } catch { setNotice('Enter a valid http(s) link.'); return }
    setBusy(true)
    const { data: dup } = await supabase.from('sources').select('id, title').eq('workspace_id', activeWorkspace).eq('url', url.toString()).limit(1)
    if (dup && dup.length > 0) { setBusy(false); setNotice(`That link is already in this workspace (as “${dup[0].title}”).`); return }
    const { data, error } = await supabase.from('sources').insert({ workspace_id: activeWorkspace, collection_id: collectionId, title: url.hostname + url.pathname.replace(/\/$/, ''), source_type: 'link', url: url.toString(), status: 'indexing' }).select('id, title, source_type, status, collection_id, engineering_analysis_status, engineering_summary').single()
    setBusy(false)
    if (error) { setNotice(`Could not add link: ${error.message}`); return }
    setSources(list => [...list, data]); setLinkUrl(''); setLinkOpen(false); setNotice('Link added. Reading the page…')
    void loadLink(data.id)
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
  const openLink = () => { setLinkOpen(true); setSourcesOpen(true); setRightCollapsed(false) }

  const createWorkspace = async (name: string, parentId: string | null) => {
    if (!user) return
    if (!canNest(workspaces, parentId)) { setNotice(`Workspaces can be nested up to ${MAX_WORKSPACE_DEPTH} levels.`); return }
    setBusy(true)
    const { data, error } = await supabase.from('workspaces').insert({ owner_id: user.id, name, parent_id: parentId }).select('id, name, parent_id').single()
    setBusy(false)
    if (error) { setNotice(`Could not create workspace: ${error.message}`); return }
    setWorkspaces(w => [...w, data])
    setActiveWorkspace(data.id)
    setNotice(`Workspace “${name}” created.`)
  }

  const statusLine = dataLoading ? 'Loading your workspace…' : workspaces.length > 0 ? `Answering from “${workspaces.find(w => w.id === activeWorkspace)?.name ?? 'Personal'}” sources.` : 'Create a workspace to bring your team’s sources together.'
  const isLink = (t: string) => t === 'link' || t === 'url'
  const sourcesPanel = <aside className="ax-glass ax-sources" aria-label="Sources">
    <div className="ax-src-head">
      <div className="ax-panel-head"><h2>Sources</h2><span className="ax-count lp-mono">{sources.length}</span><button type="button" className="ax-iconbtn ax-close" aria-label="Close sources" onClick={() => setSourcesOpen(false)}><X size={16} aria-hidden="true" /></button></div>
      <label className="ax-search"><Search size={15} aria-hidden="true" /><input aria-label="Search sources" placeholder="Search sources" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <div className="ax-menu-wrap">
        <button type="button" className="ax-addsrc ax-menu-trigger" aria-haspopup="menu" aria-expanded={menu === 'add'} onClick={() => setMenu(m => m === 'add' ? null : 'add')} disabled={busy}><Plus size={16} aria-hidden="true" /> Add source</button>
        {menu === 'add' && <div className="ax-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { setMenu(null); openUpload() }}><FilePlus2 size={15} aria-hidden="true" /> Upload file<span className="lp-mono">PDF · DOCX · PPTX · XLSX · MD · TXT</span></button>
          <button type="button" role="menuitem" onClick={() => { setMenu(null); setLinkOpen(true) }}><Link2 size={15} aria-hidden="true" /> Add link<span className="lp-mono">web page</span></button>
        </div>}
      </div>
      {linkOpen && <form className="ax-inline" onSubmit={e => { e.preventDefault(); void addLink() }}>
        <Input aria-label="Link URL" type="url" placeholder="https://…" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} autoFocus />
        <Button type="submit" size="sm" loading={busy}>Add</Button>
      </form>}
    </div>

    {notice && sourcesOpen && <p role="status" className="ax-note ax-dismissible" key={noticeState.id}><span>{notice}</span><button type="button" className="ax-notice-x" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={14} aria-hidden="true" /></button></p>}
    <EngineeringAlerts workspaceId={activeWorkspace} refreshKey={alertKey} />
    {focusSource && <p className="ax-note">Cited source: <strong>{focusSource}</strong></p>}

    {search.trim().length >= MIN_QUERY_CHARS && <section className="ax-hits" aria-label="Matches in document text" aria-live="polite">
      <p className="lp-mono ax-hits-head">{textResults?.error ?? (!textResults ? 'Searching document text…' : textResults.groups.length === 0 ? 'No matches in document text.' : `In document text · ${textResults.sourcesMatched} source${textResults.sourcesMatched === 1 ? '' : 's'}`)}{searchingText && textResults ? ' · updating…' : ''}</p>
      {textResults?.groups.map(g => <div key={g.sourceId} className="ax-hit-group">
        <p className="ax-hit-title"><b title={g.title}>{g.title}</b><span className="lp-mono">{g.total} match{g.total === 1 ? '' : 'es'}</span></p>
        {g.hits.map((h, i) => <button type="button" key={i} className="ax-hit" onClick={() => void openEvidence({ id: g.sourceId, title: g.title, kind: g.kind, url: g.url, quote: h.passage.match, location: h.location, passage: h.passage })}>
          {h.location && <i className="ax-cite-loc">{h.location}</i>}<span>{h.passage.before}<mark>{h.passage.match}</mark>{h.passage.after}</span>
        </button>)}
      </div>)}
      {textResults?.truncated && <p className="ax-note">Showing the top results. Narrow the search to see more.</p>}
    </section>}

    <ul className="ax-src-list">
      {visibleSources.length > 0
        ? visibleSources.map(src => {
            const st = sourceStatus(src.status), open = expanded === src.id
            return <li key={src.id} className="ax-src" data-open={open}>
              <div className="ax-src-row">
                <button type="button" className="ax-src-main-btn" aria-expanded={open} onClick={() => setExpanded(e => e === src.id ? null : src.id)}>
                  <ChevronRight size={14} className="ax-chev" aria-hidden="true" />
                  <span className="ax-src-icon">{isLink(src.source_type) ? <Link2 size={15} aria-hidden="true" /> : <FileText size={15} aria-hidden="true" />}</span>
                  <b title={src.title}>{src.title}</b>
                  <i className="ax-dot" data-status={st} title={statusLabel(st)} aria-label={statusLabel(st)} />
                </button>
                <div className="ax-menu-wrap">
                  <button type="button" className="ax-iconbtn ax-menu-trigger" aria-label={`Actions for ${src.title}`} aria-haspopup="menu" aria-expanded={menu === src.id} onClick={() => setMenu(m => m === src.id ? null : src.id)}><Ellipsis size={16} aria-hidden="true" /></button>
                  {menu === src.id && <div className="ax-menu ax-menu-right" role="menu">
                    <button type="button" role="menuitem" onClick={() => { setMenu(null); setPreviewId(src.id) }}><Eye size={15} aria-hidden="true" /> Preview text</button>
                    {isLink(src.source_type) && <button type="button" role="menuitem" disabled={fetchingLink === src.id} onClick={() => { setMenu(null); setExpanded(src.id); void loadLink(src.id) }}><RotateCw size={15} aria-hidden="true" /> Re-fetch page</button>}
                    <button type="button" role="menuitem" disabled={src.status !== 'ready' || analyzing === src.id} onClick={() => { setMenu(null); setExpanded(src.id); void analyze(src.id) }}><RotateCw size={15} aria-hidden="true" /> {src.engineering_analysis_status === 'complete' ? 'Reanalyze' : 'Analyze'}</button>
                    <button type="button" role="menuitem" className="ax-danger" onClick={() => { setMenu(null); void removeSource(src) }}><Trash2 size={15} aria-hidden="true" /> Remove</button>
                  </div>}
                </div>
              </div>
              {open && <div className="ax-src-detail">
                <button type="button" className="ax-linkbtn" onClick={() => setPreviewId(src.id)}><Eye size={13} aria-hidden="true" /> Preview text</button>
                <p className="lp-mono ax-src-meta">{isLink(src.source_type) ? 'Link' : 'File'} · {statusLabel(st)}</p>
                {src.status === 'ready'
                  ? <SourceEngineering sourceId={src.id} status={src.engineering_analysis_status} summary={src.engineering_summary} busy={analyzing === src.id} onReanalyze={() => void analyze(src.id)} defaultOpen />
                  : <p className="ax-note">{isLink(src.source_type) ? (src.status === 'error' ? 'Could not read this page. Try “Re-fetch page” from the ⋯ menu, or save it as a PDF and upload that.' : 'Reading the page…') : 'Engineering analysis is available once the source has readable text.'}</p>}
              </div>}
            </li>
          })
        : <li className="ax-empty"><b>{sources.length > 0 ? 'No file names match.' : 'No sources yet.'}</b><span>{sources.length > 0 ? 'Text matches, if any, are listed above.' : 'Superfolders will keep Drive, Jira and Slack sources current. Add a file or a link to begin.'}</span></li>}
    </ul>

    <details className="ax-manage">
      <summary><SlidersHorizontal size={14} aria-hidden="true" /> Manage<ChevronRight size={14} className="ax-chev" aria-hidden="true" /></summary>
      <div className="ax-manage-body">
        {collectionId && <form className="ax-inline ax-collection" onSubmit={e => { e.preventDefault(); void renameCollection() }}>
          <label><span className="lp-mono">Collection name</span><Input aria-label="Collection name" value={collectionName} onChange={e => setCollectionName(e.target.value)} /></label>
          <Button type="submit" variant="ghost" size="sm">Rename</Button>
        </form>}
        <button type="button" className="ax-wide" onClick={() => void analyzeExisting()} disabled={!!bulk}><Sparkles size={15} aria-hidden="true" /> Analyze existing sources</button>
        <button type="button" className="ax-wide" onClick={() => void analyzeExisting(true)} disabled={!!bulk}><RotateCw size={15} aria-hidden="true" /> Re-check all sources for conflicts</button>
        {bulk && <span role="status" className="lp-mono ax-note">{bulk}</span>}
      </div>
    </details>
  </aside>

  return <AppShell workspaces={workspaces} value={activeWorkspace} onChange={setActiveWorkspace} onCreate={createWorkspace} busy={busy} mode="ask" email={user.email ?? null} onSources={() => setSourcesOpen(o => !o)} onSignOut={signOut} right={sourcesPanel} rightOpen={sourcesOpen} onRightClose={() => setSourcesOpen(false)} rightCollapsed={rightCollapsed} onToggleRight={() => setRightCollapsed(c => !c)}>
    <main className="ax-chat" ref={mainRef}>
      <div className="ax-chat-bar">
        <div className="ax-column ax-chat-bar-inner">
          <button type="button" className="ax-chat-tool" onClick={newChat} disabled={!activeWorkspace || (thread.length === 0 && !conversationId)}><SquarePen size={15} aria-hidden="true" /> New chat</button>
          <div className="ax-menu-wrap">
            <button type="button" className="ax-chat-tool ax-menu-trigger" aria-haspopup="menu" aria-expanded={menu === 'history'} disabled={!activeWorkspace} onClick={() => { const opening = menu !== 'history'; setMenu(opening ? 'history' : null); if (opening) void loadConversations() }}><History size={15} aria-hidden="true" /> History</button>
            {menu === 'history' && <div className="ax-menu ax-history" role="menu" aria-label="Conversation history">
              {historyLoading && conversations.length === 0 && <p className="ax-history-empty">Loading…</p>}
              {!historyLoading && conversations.length === 0 && <p className="ax-history-empty">No saved conversations in this workspace yet.</p>}
              {conversations.map(c => <div key={c.id} className="ax-history-row" data-active={c.id === conversationId}>
                <button type="button" role="menuitem" className="ax-history-open" onClick={() => void openConversation(c.id)}><b title={c.title}>{c.title}</b><span>{historyDate(c.updated_at)}</span></button>
                <button type="button" className="ax-history-del" aria-label={`Delete conversation: ${c.title}`} onClick={() => void deleteConversation(c.id)}><Trash2 size={14} aria-hidden="true" /></button>
              </div>)}
            </div>}
          </div>
        </div>
      </div>
      <div className="ax-scroll" data-empty={thread.length === 0}>
        <div className="ax-column">
          {thread.length === 0 && <div className="ax-empty-chat">
            <p className="lp-mono ax-kicker">Ask mode</p>
            <h1>What’s on your mind?</h1>
            <p>Ask across every source in this workspace. Answers cite what they used.</p>
          </div>}
          {thread.map((m, i) => <article key={i} className="ax-turn" ref={i === thread.length - 1 ? lastTurn : undefined} aria-label={`Question ${i + 1}`}>
            <header className="ax-q"><span className="ax-who lp-mono"><i aria-hidden="true" />You</span><h2>{m.question}</h2></header>
            <div className="ax-a">
              <span className="ax-who lp-mono ax-who-ai">Footprint AI</span>
              {m.pending
                ? <p role="status" className="ax-pending">Reading your sources…</p>
                : <>
                    <div className="ax-prose">{m.answer.split(/\n{2,}/).map((para, k) => <p key={k}>{para}</p>)}</div>
                    {m.citations.length > 0 && <div className="ax-cites" aria-label="Sources cited">
                      {m.citations.map((c, n) => <button type="button" key={c.id} className="ax-cite" title={c.quote || c.title} onClick={() => void openEvidence(c)}><b className="lp-mono">{n + 1}</b>{c.kind === 'link' ? <Link2 size={13} aria-hidden="true" /> : <FileText size={13} aria-hidden="true" />}<span>{c.title}</span>{c.location && <i className="ax-cite-loc">{c.location}</i>}</button>)}
                    </div>}
                    <button type="button" className="ax-copy" onClick={() => void navigator.clipboard?.writeText(m.answer)}><Copy size={13} aria-hidden="true" /> Copy</button>
                  </>}
            </div>
          </article>)}
        </div>
      </div>
      <div className="ax-dock" ref={dockRef}>
        <div className="ax-column">
          {notice && <p className="ax-notice ax-dismissible" role="status" key={noticeState.id}><span>{notice}</span><button type="button" className="ax-notice-x" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={14} aria-hidden="true" /></button></p>}
          <PromptBar onSend={q => void ask(q)} onUpload={openUpload} onAddLink={openLink} asking={asking} onStop={stop} placeholder={asking ? 'Thinking…' : 'Ask your engineering sources…'} />
          <p className="ax-hint lp-mono">{statusLine} <span>Shift + Enter for new line</span></p>
        </div>
      </div>
    </main>
    <input ref={fileInput} type="file" hidden accept={ACCEPT_ATTR} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadFile(f) }} />
    <SourcePreview sourceId={previewId} onClose={() => setPreviewId(null)} />
    <SourceEvidenceDrawer source={evidence?.source ?? null} claims={evidence?.claims ?? []} quote={evidence?.quote} location={evidence?.location ?? null} passage={evidence?.passage ?? null} onClose={() => setEvidence(null)} />
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
