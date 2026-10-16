import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowUpRight, FileText, FolderOpen, Link2 } from 'lucide-react'
import { pageHead } from '@/components/page-head'
import { MarketingPage, Reveal, SplitHeading } from '@/components/landing/shared'

export const Route = createFileRoute('/collections')({
  head: () => pageHead('Collections — Footprint', 'How Footprint workspaces, sub-workspaces, and collections organize engineering sources.'),
  component: Collections,
})

type Src = { name: string; kind: 'file' | 'link'; tag: string }
type Node = { id: string; label: string; level: 0 | 1; collection: string; sources: Src[] }

const tree: Node[] = [
  { id: 'ap', label: 'Actuator Program', level: 0, collection: 'General', sources: [
    { name: 'Program requirements.md', kind: 'file', tag: 'Markdown' }, { name: 'Interface drawing.pdf', kind: 'file', tag: 'PDF' }, { name: 'Supplier datasheet', kind: 'link', tag: 'Link' }] },
  { id: 'gb', label: 'Gearbox', level: 1, collection: 'General', sources: [
    { name: 'Gear ratio study.md', kind: 'file', tag: 'Markdown' }, { name: 'Housing tolerances.txt', kind: 'file', tag: 'Text' }] },
  { id: 'ct', label: 'Controller', level: 1, collection: 'General', sources: [
    { name: 'Firmware notes.md', kind: 'file', tag: 'Markdown' }, { name: 'Vendor reference', kind: 'link', tag: 'Link' }, { name: 'Bench test log.txt', kind: 'file', tag: 'Text' }] },
  { id: 'tc', label: 'Test Campaign', level: 0, collection: 'General', sources: [
    { name: 'Thermal soak plan.md', kind: 'file', tag: 'Markdown' }, { name: 'Run 14 report.pdf', kind: 'file', tag: 'PDF' }] },
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
  return <MarketingPage>
    <section className="lp-pagehero lp-col-hero">
      <div className="lp-inner lp-col-hero-inner">
        <div>
          <p className="lp-mono lp-eyebrow">Collections · organized knowledge</p>
          <SplitHeading className="lp-mega" lines={[{ t: 'Related ideas.' }, { t: 'One shared home.', accent: true }]} />
        </div>
        <Reveal dir="right" delay={400}><p className="lp-lead">Workspaces keep programs apart. Sub-workspaces break them into parts. Collections group the sources inside. Try the structure below.</p></Reveal>
      </div>
    </section>

    <section className="lp-col-bento-wrap" aria-label="How Footprint organizes information">
      <div className="lp-inner lp-bento">
        <Reveal dir="left" className="lp-lit lp-steel lp-b-explorer"><Explorer /></Reveal>
        <Reveal dir="right" delay={120} className="lp-b-boundary lp-slate-tile">
          <p className="lp-mono lp-eyebrow">The boundary</p>
          <h2>The workspace is the boundary.</h2>
          <p>Sources, questions and answers are scoped to the workspace you are in. Collections organize what is inside it. They are not separate permission groups.</p>
          <div className="lp-glass lp-mini-glass"><b>Owner-only today</b><span>Workspaces are accessible only to the account that owns them.</span></div>
        </Reveal>
        <Reveal dir="up" delay={60} className="lp-b-sub">
          <p className="lp-mono lp-eyebrow">Sub-workspaces</p>
          <h3>Break a program into parts.</h3>
          <p>Create a sub-workspace beneath any workspace. Each has its own sources and its own scope for questions, so Gearbox answers stay about the gearbox.</p>
        </Reveal>
        <Reveal dir="scale" delay={140} className="lp-b-kinds">
          <p className="lp-mono lp-eyebrow">What goes in</p>
          <h3>Files and links.</h3>
          <p>PDF, Markdown and text files up to 20 MB, plus saved web links. Links are references; they are not fetched or read.</p>
        </Reveal>
        <Reveal dir="up" delay={100} className="lp-lit lp-steel lp-b-status">
          <div>
            <p className="lp-mono lp-eyebrow">Available today</p>
            <ul className="lp-checks">
              <li>Workspaces and one level of sub-workspaces</li>
              <li>A collection named General in every workspace, which you can rename</li>
              <li>Search across source titles in the active workspace</li>
            </ul>
          </div>
          <div>
            <p className="lp-mono lp-eyebrow lp-planned">Not available yet</p>
            <ul className="lp-checks lp-checks-muted">
              <li>Creating several collections in one workspace from the app</li>
              <li>Sharing a workspace with teammates</li>
              <li>Importing from other tools</li>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>

    <section className="lp-section lp-col-end" aria-label="Next">
      <div className="lp-inner lp-col-end-inner">
        <Reveal dir="left"><h2 className="lp-h2">Simple structure. <span>Shared context.</span></h2></Reveal>
        <Reveal dir="right" delay={120}><p className="lp-body">Keep source names clear and group documents around a question, a program, or a recurring topic. <Link to="/how-it-works" className="lp-textlink lp-textlink-ink">Follow the full workflow <ArrowUpRight size={15} aria-hidden="true" /></Link></p></Reveal>
      </div>
    </section>
  </MarketingPage>
}
