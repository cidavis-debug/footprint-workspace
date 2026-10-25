import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, FileText, Link2 } from 'lucide-react'
import { pageHead } from '@/components/page-head'
import { Emerge, MarketingPage, Plane, Reveal, SplitHeading, Stage, WordReveal, clamp, prefersReducedMotion, useScrollProgress, type Dir } from '@/components/landing/shared'

export const Route = createFileRoute('/how-it-works')({
  head: () => pageHead('How it works — Footprint AI', 'The Footprint AI workflow: create a workspace, add files and links, organize collections, ask cited questions, and analyze sources for potential conflicts.'),
  component: HowItWorks,
})

type Step = { id: string; n: string; title: string; lead: string; dir: Dir; body: ReactNode; tone?: 'slate' }

const steps: Step[] = [
  { id: 'workspace', n: '01', title: 'Create a workspace', dir: 'slide-l',
    lead: 'A workspace is the home for one program or team’s sources. Sub-workspaces nest one level beneath it, so a subsystem can have its own space without losing the parent.',
    body: <ul className="lp-tree" aria-label="Example workspace structure">
      <li><b>Actuator Program</b><span className="lp-mono">Workspace</span></li>
      <li className="sub"><b>Gearbox</b><span className="lp-mono">Sub-workspace</span></li>
      <li className="sub"><b>Controller</b><span className="lp-mono">Sub-workspace</span></li>
      <li><b>Test Campaign</b><span className="lp-mono">Workspace</span></li>
    </ul> },
  { id: 'add', n: '02', title: 'Add files and links', dir: 'slide-r',
    lead: 'Upload files or save web links into the active workspace. Footprint AI reads the text of every supported format so answers can cite it.',
    body: <dl className="lp-facts">
      <div><dt>Files</dt><dd>PDF, Word, Excel, PowerPoint, Markdown, text</dd></div>
      <div><dt>Size</dt><dd>Up to 20 MB each</dd></div>
      <div><dt>Links</dt><dd>Public web pages (http or https)</dd></div>
      <div><dt>Read for answers</dt><dd>Text from every supported format</dd></div>
    </dl> },
  { id: 'organize', n: '03', title: 'Organize into collections', dir: 'none',
    lead: 'Every workspace starts with a collection named General. Rename it, and everything you add is grouped there, with the file or link type visible at a glance.',
    body: <ul className="lp-rows" aria-label="Example collection">
      <li><FileText size={16} aria-hidden="true" /><b>Interface drawing.pdf</b><span className="lp-mono">read for answers</span></li>
      <li><FileText size={16} aria-hidden="true" /><b>Requirements.md</b><span className="lp-mono">read for answers</span></li>
      <li><FileText size={16} aria-hidden="true" /><b>Test notes.txt</b><span className="lp-mono">read for answers</span></li>
      <li><Link2 size={16} aria-hidden="true" /><b>Supplier datasheet</b><span className="lp-mono">page text read</span></li>
    </ul> },
  { id: 'ask', n: '04', title: 'Ask, with citations', dir: 'fade', tone: 'slate',
    lead: 'Ask a question in plain language. The answer draws on the active workspace and names the sources it used, so you can open them and check.',
    body: <div className="lp-qa">
      <p className="lp-mono">Illustrative example</p>
      <p className="lp-qa-q">What clearance does the actuator housing need?</p>
      <p className="lp-qa-a">2 mm of radial clearance on all sides, as defined in the interface drawing and repeated in the assembly specification.</p>
      <div className="lp-cites"><span><b className="lp-mono">1</b>Interface Drawing</span><span><b className="lp-mono">2</b>Assembly Specification</span></div>
      <p className="lp-fine">No answer is guaranteed to be perfect. Check important details against the original.</p>
    </div> },
  { id: 'analyze', n: '05', title: 'Analyze for conflicts', dir: 'slide-d',
    lead: 'Run analysis on supported sources. Footprint AI extracts engineering claims — interfaces, requirements, decisions, constraints and assumptions — and compares them across the workspace. Possible conflicts land in Radar for your review, with a confidence level and a likely-stale-source hint.',
    body: <div className="lp-conflict">
      <div><span className="lp-mono">Interface Drawing</span><strong>8<small>mm</small></strong></div>
      <div className="vs lp-mono">vs</div>
      <div className="hot"><span className="lp-mono">Assembly Specification</span><strong>10<small>mm</small></strong></div>
      <p>Potential conflict — review required. Footprint AI flags it; your team decides which source is correct.</p>
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
        <SplitHeading className="lp-mega" lines={[{ t: 'From scattered files' }, { t: 'to a cited answer.', accent: true }]} />
        <Reveal dir="none" delay={500} className="lp-lit lp-glass lp-hiw-sub"><p className="lp-lead">One workflow, from the first file to the first conflict flagged for review. Follow it down the page.</p></Reveal>
      </div>
    </Stage>
    <section className="lp-journey-wrap" aria-label="The Footprint AI workflow"><div className="lp-inner"><Journey /></div></section>
    <Stage className="lp-section lp-dark lp-slate lp-honest arc-sec arc-wt arc-t-l arc-b-l" aria-labelledby="lp-honest-h">
      <div className="lp-dark-bg" aria-hidden="true" />
      <div className="lp-inner">
        <p className="lp-mono lp-eyebrow">A note on links</p>
        <h2 id="lp-honest-h" className="lp-sr">Links stay honest</h2>
        <WordReveal className="lp-statement lp-statement-dark" text="Links stay honest. Footprint AI reads public web pages you save, but it cannot open private Google Drive or OneDrive content." />
        <Emerge from="left" delay={150}><p className="lp-body">For private documents, upload a supported file. <Link to="/security" className="lp-textlink">Read the data boundaries <ArrowUpRight size={15} aria-hidden="true" /></Link></p></Emerge>
      </div>
    </Stage>
  </MarketingPage>
}

