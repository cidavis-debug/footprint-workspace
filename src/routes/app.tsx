import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Button, Composer, Icon, SourceItem, SourcesDrawer, WorkspaceSelector } from '@/design-system/footprint-0a8b1a'
import { pageHead } from '@/components/page-head'
import { Brand } from '@/components/brand'
import { Illustration } from '@/components/illustration'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/integrations/supabase/client'

type Workspace = { id: string; name: string }
type Collection = { id: string; name: string; description: string | null }
type Source = { id: string; title: string; source_type: string; status: string; collection_id: string | null }

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

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setDataLoading(true)
    void (async () => {
      const { data: ws } = await supabase.from('workspaces').select('id, name').order('created_at')
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
        supabase.from('sources').select('id, title, source_type, status, collection_id').eq('workspace_id', activeWorkspace).order('created_at'),
      ])
      if (cancelled) return
      setCollections(cols ?? [])
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

  const unavailable = () => setNotice('Adding sources and asking questions is coming next. Nothing has been saved or sent.')
  const workspaceOptions = workspaces.map(w => ({ value: w.id, label: w.name }))

  return <main className="site-width">
    <header className="workspace-header">
      <Link to="/" className="wordmark"><Brand /></Link>
      <div className="workspace-actions">
        {workspaceOptions.length > 0 && <WorkspaceSelector value={activeWorkspace} onChange={e => setActiveWorkspace(e.target.value)} options={workspaceOptions} size="sm" />}
        <span className="demo-label">{user.email}</span>
        <Button variant="ghost" onClick={() => setSourcesOpen(true)}><Icon name="Folder" /> Sources</Button>
        <Button variant="quiet" onClick={signOut}>Log out</Button>
      </div>
    </header>
    <section className="workspace-main">
      <Illustration name="empty" eager />
      <p className="section-kicker">Your shared knowledge, in focus</p>
      <h1>What’s on your mind?</h1>
      <p>A clear question. The right context. A place to think together.</p>
      <Composer onSend={unavailable} onUpload={unavailable} onAddLink={unavailable} placeholder="Ask a question…" />
      {dataLoading
        ? <p className="workspace-status" role="status">Loading your workspace…</p>
        : <p className="workspace-status">{workspaces.length > 0 ? `Connected to “${workspaces.find(w => w.id === activeWorkspace)?.name ?? 'Personal'}”. AI answers are coming next.` : 'No workspace found for this account.'}</p>}
      {notice && <p className="connection-notice" role="status">{notice}</p>}
    </section>
    <SourcesDrawer open={sourcesOpen} onClose={() => setSourcesOpen(false)} onAddSource={unavailable} onSearch={setSearch}>
      {visibleSources.length > 0
        ? visibleSources.map(s => <SourceItem key={s.id} name={s.title} kind={s.source_type === 'link' || s.source_type === 'url' ? 'link' : 'file'} status={sourceStatus(s.status)} />)
        : <div className="empty-sources"><h2>{sources.length > 0 ? 'No matches.' : 'No sources yet.'}</h2><p>{sources.length > 0 ? 'Try a different search.' : `Your “${collections[0]?.name ?? 'General'}” collection is ready — adding documents and links is coming next.`}</p>{notice && <p role="status" className="mt-5">{notice}</p>}</div>}
    </SourcesDrawer>
  </main>
}
