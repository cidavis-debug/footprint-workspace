import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, FileText, Link2 } from 'lucide-react'
import { pageHead } from '@/components/page-head'
import { Emerge, MarketingPage, Plane, Reveal, SplitHeading, Stage, WordReveal, clamp, prefersReducedMotion, useScrollProgress, type Dir } from '@/components/landing/shared'

export const Route = createFileRoute('/how-it-works')({
  head: () => pageHead('How it works — Footprint AI', 'The Footprint AI workflow: set up shared workspaces, connect superfolders, ask cited questions, and catch and route conflicts before they cause redesigns.'),
  component: HowItWorks,
})

type Step = { id: string; n: string; title: string; lead: string; dir: Dir; body: ReactNode; tone?: 'slate' }

const steps: Step[] = [
  { id: 'workspace', n: '01', title: 'Set up shared workspaces', dir: 'slide-l',
    lead: 'Start with a personal workspace, then add shared ones for a team, group or company. Sub-workspaces let Footprint look only at the information you want.',
    body: <ul className="lp-tree" aria-label="Example workspace structure">
      <li><b>Actuator Program</b><span className="lp-mono">Workspace</span></li>
      <li className="sub"><b>Gearbox</b><span className="lp-mono">Sub-workspace</span></li>
      <li className="sub"><b>Controller</b><span className="lp-mono">Sub-workspace</span></li>
      <li><b>Test Campaign</b><span className="lp-mono">Workspace</span></li>
    </ul> },
  { id: 'add', n: '02', title: 'Connect your superfolders', dir: 'slide-r',
    lead: 'A superfolder is the set of places to track for a workspace, such as a desktop folder, a OneNote notebook, a Drive folder, a Jira project or a Slack channel. Footprint tracks them and stays up to date.',
    body: <dl className="lp-facts">
      <div><dt>Files</dt><dd>PDF, Word, Excel, PowerPoint, Markdown, text</dd></div>
      <div><dt>Sources</dt><dd>Drive, SharePoint, Jira, Confluence, PLM</dd></div>
      <div><dt>Chat</dt><dd>Slack and Teams</dd></div>
      <div><dt>Kept current</dt><dd>Auto-sync, no re-uploading</dd></div>
    </dl> },
  { id: 'organize', n: '03', title: 'One view across sources', dir: 'none',
    lead: 'Every workspace brings its sources together, with each source’s type, owner and revision visible at a glance, so questions start from the right material.',
    body: <ul className="lp-rows" aria-label="Example collection">
      <li><FileText size={16} aria-hidden="true" /><b>Interface drawing.pdf</b><span className="lp-mono">Drive · synced</span></li>
      <li><FileText size={16} aria-hidden="true" /><b>Requirements</b><span className="lp-mono">Jira · synced</span></li>
      <li><FileText size={16} aria-hidden="true" /><b>Test notes</b><span className="lp-mono">Slack · synced</span></li>
      <li><Link2 size={16} aria-hidden="true" /><b>Supplier datasheet</b><span className="lp-mono">PLM · synced</span></li>
    </ul> },
  { id: 'ask', n: '04', title: 'Ask, with citations', dir: 'fade', tone: 'slate',
    lead: 'Ask a question in plain language. The answer draws on the active workspace and names the sources it used and who owns each one, so you can open them and check.',
    body: <div className="lp-qa">
      <p className="lp-mono">Illustrative example</p>
      <p className="lp-qa-q">What clearance does the actuator housing need?</p>
      <p className="lp-qa-a">2 mm of radial clearance on all sides, as defined in the interface drawing and repeated in the assembly specification.</p>
      <div className="lp-cites"><span><b className="lp-mono">1</b>Interface Drawing</span><span><b className="lp-mono">2</b>Assembly Specification</span></div>
      <p className="lp-fine">No answer is guaranteed to be perfect. Check important details against the original.</p>
    </div> },
  { id: 'analyze', n: '05', title: 'Catch and route conflicts', dir: 'slide-d',
    lead: 'Footprint pulls the main assumptions and design decisions from every source and flags where they conflict, including EBOM against MBOM. Review the evidence, contact the owners in Slack or Teams, or let Footprint draft the engineering change order.',
    body: <div className="lp-conflict">
      <div><span className="lp-mono">Interface Drawing</span><strong>8<small>mm</small></strong></div>
      <div className="vs lp-mono">vs</div>
      <div className="hot"><span className="lp-mono">Assembly Specification</span><strong>10<small>mm</small></strong></div>
      <p>Potential conflict — review required. Footprint AI flags it and routes it to the owners; your team decides which source is correct.</p>
    </div> },
]

function Journey() {
  const scroll = useScrollProgress<HTMLDivElement>()
  const [active, setActive] = useState(0)
  const panels = useRef<(HTMLElement | null)[]>([])
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset['i']))
    }, { rootMargin: '-38% 0px -52% 0px' })
    panels.current.forEach(p => p && io.observe(p))
    return () => io.disconnect()
  }, [])
  const go = (i: number) => panels.current[i]?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' })
  return <div className="lp-journey" ref={scroll}>
    <nav className="lp-rail" aria-label="Workflow steps">
      <div className="lp-rail-track" aria-hidden="true"><i style={{ height: `${clamp((active + 0.5) / steps.length) * 100}%` }} /></div>
      <ol>
        {steps.map((s, i) => <li key={s.id}><button type="button" aria-current={i === active ? 'step' : undefined} data-done={i < active} onClick={() => go(i)}><span className="lp-mono">{s.n}</span>{s.title}</button></li>)}
      </ol>
    </nav>
    <div className="lp-panels">
      {steps.map((s, i) => <section key={s.id} id={s.id} data-i={i} ref={el => { panels.current[i] = el }} aria-labelledby={`${s.id}-h`}>
        <Reveal dir={s.dir} className={`lp-lit lp-step ${s.tone === 'slate' ? 'lp-step-slate' : 'lp-steel'}`}>
          <div className="lp-step-copy">
            <p className="lp-mono lp-eyebrow">Step {s.n}</p>
            <h2 id={`${s.id}-h`} className="lp-step-title">{s.title}</h2>
            <p className="lp-body">{s.lead}</p>
          </div>
          <div className="lp-step-body">{s.body}</div>
        </Reveal>
      </section>)}
    </div>
  </div>
}

function HowItWorks() {
  return <MarketingPage endsDark>
    <Stage className="lp-pagehero lp-hiw-hero">
      <Plane className="arc-plane-cut" speed={0} />
      <Plane className="arc-plane-cut-wire" speed={0} />
      <div className="lp-inner lp-hiw-hero-inner">
        <p className="lp-mono lp-eyebrow">How it works · five steps</p>
        <SplitHeading className="lp-mega" lines={[{ t: 'From scattered sources' }, { t: 'to one source of truth.', accent: true }]} />
        <Reveal dir="none" delay={500} className="lp-lit lp-glass lp-hiw-sub"><p className="lp-lead">Set it up once and Footprint does the rest: from connected superfolders to a resolved conflict. Follow it down the page.</p></Reveal>
      </div>
    </Stage>
    <section className="lp-journey-wrap" aria-label="The Footprint AI workflow"><div className="lp-inner"><Journey /></div></section>
    <Stage className="lp-section lp-dark lp-slate lp-honest arc-sec arc-wt arc-t-l arc-b-l" aria-labelledby="lp-honest-h">
      <div className="lp-dark-bg" aria-hidden="true" />
      <div className="lp-inner">
        <p className="lp-mono lp-eyebrow">A note on control</p>
        <h2 id="lp-honest-h" className="lp-sr">Your tools stay yours</h2>
        <WordReveal className="lp-statement lp-statement-dark" text="Your tools stay yours. Footprint connects to the systems of record you already use, with the access you authorize, and never rewrites your documents." />
        <Emerge from="left" delay={150}><p className="lp-body">Footprint complements PLM and PDM; it never replaces them. <Link to="/security" className="lp-textlink">Read the data boundaries <ArrowUpRight size={15} aria-hidden="true" /></Link></p></Emerge>
      </div>
    </Stage>
  </MarketingPage>
}

