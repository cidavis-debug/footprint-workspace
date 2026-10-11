import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Composer, Icon, SourcesDrawer } from '@/design-system/footprint-0a8b1a'
import { pageHead } from '@/components/page-head'
import { Brand } from '@/components/brand'
import { Illustration } from '@/components/illustration'

export const Route = createFileRoute('/app')({ head: () => pageHead('Workspace — Footprint', 'A focused workspace for questions, documents, and shared team knowledge.'), component: Workspace })
function Workspace() {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const unavailable = () => setNotice('Connect your existing project in the Lovable editor to add sources and ask questions. Nothing has been saved or sent.')
  return <main className="site-width">
    <header className="workspace-header"><Link to="/" className="wordmark"><Brand /></Link><div className="workspace-actions"><span className="demo-label">Not connected</span><Button variant="ghost" onClick={() => setSourcesOpen(true)}><Icon name="Folder" /> Sources</Button><Link to="/login" className="site-link">Log in</Link></div></header>
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