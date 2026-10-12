import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Composer, Icon, SourcesDrawer } from '@/design-system/footprint-0a8b1a'
import { pageHead } from '@/components/page-head'
import { Brand } from '@/components/brand'
import { Illustration } from '@/components/illustration'
import { useAuth } from '@/hooks/use-auth'

export const Route = createFileRoute('/app')({ ssr: false, head: () => pageHead('Workspace — Footprint', 'A focused workspace for questions, documents, and shared team knowledge.'), component: Workspace })
function Workspace() {
  const { user, loading, signOut } = useAuth()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [notice, setNotice] = useState('')
  if (loading) return <main className="site-width"><p className="workspace-status" role="status">Opening your workspace…</p></main>
  if (!user) return <Navigate to="/login" search={{ redirect: '/app' }} replace />
  const unavailable = () => setNotice('Adding sources and asking questions is coming next. Nothing has been saved or sent.')
  return <main className="site-width">
    <header className="workspace-header"><Link to="/" className="wordmark"><Brand /></Link><div className="workspace-actions"><span className="demo-label">{user.email}</span><Button variant="ghost" onClick={() => setSourcesOpen(true)}><Icon name="Folder" /> Sources</Button><Button variant="quiet" onClick={signOut}>Log out</Button></div></header>
    <section className="workspace-main">
      <Illustration name="empty" eager />
      <p className="section-kicker">Your shared knowledge, in focus</p>
      <h1>What’s on your mind?</h1>
      <p>A clear question. The right context. A place to think together.</p>
      <Composer onSend={unavailable} onUpload={unavailable} onAddLink={unavailable} placeholder="Ask a question…" />
      <p className="workspace-status">No workspace connected. Sources and AI answers are unavailable.</p>
      {notice && <p className="connection-notice" role="status">{notice}</p>}
    </section>
    <SourcesDrawer open={sourcesOpen} onClose={() => setSourcesOpen(false)} onAddSource={unavailable} onSearch={() => {}}><div className="empty-sources"><h2>No sources yet.</h2><p>Connect your existing project before adding documents, links, or collections.</p>{notice && <p role="status" className="mt-5">{notice}</p>}</div></SourcesDrawer>
  </main>
}