import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowUpRight, FileText, FolderOpen, Link2 } from 'lucide-react'
import { pageHead } from '@/components/page-head'
import { Emerge, MarketingPage, Plane, Rail, Reveal, SplitHeading, Stage } from '@/components/landing/shared'

export const Route = createFileRoute('/collections')({
  head: () => pageHead('Collections — Footprint AI', 'How Footprint AI superfolders, workspaces, sub-workspaces and collections connect and organize engineering sources.'),
  component: Collections,
})

type Src = { name: string; kind: 'file' | 'link'; tag: string }
type Node = { id: string; label: string; level: 0 | 1; collection: string; sources: Src[] }

const tree: Node[] = [
  { id: 'ap', label: 'Actuator Program', level: 0, collection: 'General', sources: [
    { name: 'Program requirements', kind: 'file', tag: 'Jira' }, { name: 'Interface drawing.pdf', kind: 'file', tag: 'Drive' }, { name: 'Supplier datasheet', kind: 'link', tag: 'PLM' }] },
  { id: 'gb', label: 'Gearbox', level: 1, collection: 'General', sources: [
    { name: 'Gear ratio study', kind: 'file', tag: 'Confluence' }, { name: 'Housing tolerances', kind: 'file', tag: 'SharePoint' }] },
  { id: 'ct', label: 'Controller', level: 1, collection: 'General', sources: [
    { name: 'Firmware notes', kind: 'file', tag: 'Notion' }, { name: 'Vendor reference', kind: 'link', tag: 'Link' }, { name: 'Bench test log', kind: 'file', tag: 'Slack' }] },
  { id: 'tc', label: 'Test Campaign', level: 0, collection: 'General', sources: [
    { name: 'Thermal soak plan', kind: 'file', tag: 'OneNote' }, { name: 'Run 14 report.pdf', kind: 'file', tag: 'Drive' }] },
]

function Explorer() {
  const [id, setId] = useState('ap')
  const cur = tree.find(n => n.id === id)!
  const parent = cur.level === 1 ? [...tree.slice(0, tree.indexOf(cur))].reverse().find(n => n.level === 0) : undefined
  return <div className="lp-explorer">
    <nav className="lp-ex-tree" aria-label="Example workspaces">
      <p className="lp-mono lp-eyebrow">Workspaces</p>
      <ul>{tree.map(n => <li key={n.id} data-level={n.level}><button type="button" aria-pressed={n.id === id} onClick={() => setId(n.id)}><FolderOpen size={15} aria-hidden="true" />{n.label}</button></li>)}</ul>
    </nav>
    <div className="lp-ex-view" key={id} aria-live="polite">
      <p className="lp-mono lp-crumb">{parent ? `${parent.label} / ` : ''}{cur.label} / <b>{cur.collection}</b></p>
      <h3>{cur.label}</h3>
      <ul className="lp-rows">
        {cur.sources.map(s => <li key={s.name}>{s.kind === 'link' ? <Link2 size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}<b>{s.name}</b><span className="lp-mono">{s.tag}</span></li>)}
      </ul>
      <p className="lp-scope"><b>{cur.sources.length} sources</b> in scope. A question asked here draws only on these{cur.level === 1 ? ' — not the parent workspace' : ''}.</p>
      <p className="lp-fine">Illustrative example · names are not real data.</p>
    </div>
  </div>
}

function Collections() {
  return <MarketingPage lean="l">
    <Stage className="lp-pagehero lp-col-hero">
      <Plane className="arc-plane-col" speed={0} />
      <div className="lp-inner lp-col-hero-inner">
        <div>
          <p className="lp-mono lp-eyebrow">Superfolders · connected knowledge</p>
          <SplitHeading className="lp-mega" lines={[{ t: 'Every source.' }, { t: 'One shared home.', accent: true }]} />
        </div>
        <Reveal dir="slide-r" delay={400} className="lp-lit lp-glass-light"><p className="lp-lead">Workspaces keep programs apart. Sub-workspaces break them into parts. Superfolders connect the tools your sources live in. Try the structure below.</p></Reveal>
      </div>
    </Stage>

    <section className="lp-col-bento-wrap" aria-label="How Footprint AI organizes information">
      <div className="lp-inner lp-bento">
        <Reveal dir="slide-l" className="lp-lit lp-steel lp-b-explorer"><Explorer /></Reveal>
        <Reveal dir="slide-r" delay={120} className="arc-plate arc-f-slate lp-b-boundary">
          <p className="lp-mono lp-eyebrow">The boundary</p>
          <h2>The workspace is the boundary.</h2>
          <p>Sources, questions and answers are scoped to the workspace you are in, and shared with your whole team. Collections organize what is inside it. They are not separate permission groups.</p>
          <div className="lp-glass lp-mini-glass"><b>Shared with your team</b><span>Team workspaces give every engineer the same source of truth.</span></div>
        </Reveal>
        <Reveal dir="none" className="lp-b-sub">
          <p className="lp-mono lp-eyebrow">Sub-workspaces</p>
          <h3>Break a program into parts.</h3>
          <p>Create a sub-workspace beneath any workspace. Each has its own sources and its own scope for questions, so Gearbox answers stay about the gearbox.</p>
        </Reveal>
        <Reveal dir="slide-d" delay={140} className="lp-b-kinds">
          <p className="lp-mono lp-eyebrow">What goes in</p>
          <h3>Files, links and tools.</h3>
          <p>Files up to 20 MB, public web links, and connected tools such as Drive, OneDrive, SharePoint, Jira, Confluence, Notion, Slack, Teams and PLM, kept in sync by superfolders.</p>
        </Reveal>
        <Reveal dir="slide-u" delay={100} className="lp-lit arc-plate arc-f-frost lp-b-status">
          <div>
            <p className="lp-mono lp-eyebrow">Foundations</p>
            <ul className="lp-checks">
              <li>Workspaces and sub-workspaces</li>
              <li>Shared team workspaces, one home per program</li>
              <li>Search across every source in the active workspace</li>
            </ul>
          </div>
          <div>
            <p className="lp-mono lp-eyebrow lp-planned">The platform</p>
            <ul className="lp-checks lp-checks-muted">
              <li>Superfolders that auto-sync Drive, SharePoint, Jira and Confluence</li>
              <li>Slack and Teams routing to the right owner</li>
              <li>EBOM-to-MBOM checks and change-order drafting</li>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>

    <section className="lp-section lp-col-end" aria-label="Next">
      <div className="lp-inner">
      <Rail className="arc-rail-wide" />
      <div className="lp-col-end-inner">
        <Emerge from="left"><h2 className="lp-h2">Simple structure. <span>Shared context.</span></h2></Emerge>
        <Reveal dir="none"><p className="lp-body">Connect a superfolder once and Footprint keeps the program’s sources current. <Link to="/how-it-works" className="lp-textlink lp-textlink-ink">Follow the full workflow <ArrowUpRight size={15} aria-hidden="true" /></Link></p></Reveal>
      </div>
      </div>
    </section>
  </MarketingPage>
}
