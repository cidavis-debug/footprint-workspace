import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, ArrowUpRight, FileText, FolderOpen, RotateCcw } from 'lucide-react'
import { Header, Mark, Reveal, WordReveal, clamp, nav, prefersReducedMotion, smooth, useInView, useOpenApp, useScrollProgress, v, type OpenHandler } from './shared'
import './landing.css'

/* ---------- 1. hero: mechanical bloom, scrubbed by scroll ---------- */

const BLOOM_SRC = '/Footprint AI — Mechanical Bloom Zoom Transition.mp4'
const BLOOM_POSTER = '/footprint-bloom-poster.jpg'

function Hero({ onOpen }: { onOpen: OpenHandler }) {
  const outer = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = outer.current, vid = video.current
    if (!el || !vid) return
    const reduce = prefersReducedMotion()
    if (reduce) { el.style.setProperty('--t', '0'); el.style.setProperty('--text', '1'); return }
    let target = 0, shown = 0, raf = 0, running = true
    const readTarget = () => {
      const max = Math.max(el.offsetHeight - window.innerHeight, 1)
      const y = clamp(-el.getBoundingClientRect().top / max)
      target = y
    }
    const frame = () => {
      if (!running) return
      readTarget()
      shown += (target - shown) * 0.2
      if (Math.abs(target - shown) < 0.0004) shown = target
      const t = shown
      el.style.setProperty('--t', t.toFixed(4))
      el.style.setProperty('--text', String(1 - clamp(target / 0.12)))
      el.style.setProperty('--wash', smooth((t - 0.86) / 0.14).toFixed(4))
      el.style.setProperty('--grow', smooth(t / 0.3).toFixed(4))
      const d = vid.duration
      if (d && isFinite(d) && !vid.seeking) {
        const want = clamp(t) * (d - 0.04)
        if (Math.abs(vid.currentTime - want) > 1 / 90) vid.currentTime = want
      }
      raf = requestAnimationFrame(frame)
    }
    vid.pause()
    raf = requestAnimationFrame(frame)
    return () => { running = false; cancelAnimationFrame(raf) }
  }, [])

  return <section className="lp-hero" ref={outer}>
    <div className="lp-hero-sticky">
      <div className="lp-bloom">
        <video ref={video} className="lp-bloom-video" src={encodeURI(BLOOM_SRC)} poster={BLOOM_POSTER} muted playsInline preload="auto" aria-hidden="true" tabIndex={-1} />
      </div>
      <div className="lp-wash" aria-hidden="true" />
      <div className="lp-inner lp-hero-inner">
        <div className="lp-hero-copy">
          <p className="lp-mono lp-eyebrow">For hardware engineering teams</p>
          <h1 className="lp-h1">Complex Engineering. <span>Connected Intelligence.</span></h1>
          <p className="lp-lead">Footprint helps hardware engineering teams organize information, ask questions across their sources, and identify potential inconsistencies before they become expensive.</p>
          <div className="lp-actions">
            <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onOpen}>Open Footprint <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link to="/how-it-works" className="lp-btn lp-btn-ghost lp-btn-lg">See how it works</Link>
          </div>
          <ul className="lp-trio">
            <li><FolderOpen size={18} aria-hidden="true" /> Organize sources</li>
            <li><FileText size={18} aria-hidden="true" /> Ask with citations</li>
            <li><AlertTriangle size={18} aria-hidden="true" /> Spot inconsistencies</li>
          </ul>
        </div>
      </div>
      <p className="lp-scrollcue lp-mono" aria-hidden="true">Scroll to open</p>
    </div>
  </section>
}

/* ---------- 2. problem: typographic statement ---------- */

const hiding = [
  { n: '01', t: 'Drawings and CAD exports', d: 'Where a dimension or interface is actually defined.' },
  { n: '02', t: 'Requirements', d: 'What the design is obliged to satisfy, and from which revision.' },
  { n: '03', t: 'Test reports', d: 'What was measured, under which conditions.' },
  { n: '04', t: 'Review notes', d: 'Why a decision was made, and who agreed to it.' },
] as const

function Problem() {
  return <section className="lp-section lp-problem" aria-labelledby="lp-problem-h">
    <div className="lp-inner">
      <p className="lp-mono lp-eyebrow">01 — The problem</p>
      <h2 id="lp-problem-h" className="lp-sr">The problem</h2>
      <WordReveal className="lp-statement" text="The answer exists. It’s spread across drawings, requirements, test reports, and decisions — and teams lose time rebuilding context instead of using it." />
      <div className="lp-split-text">
        <Reveal><p className="lp-body">Every hardware program accumulates documents that each hold part of the truth. When they drift apart, nobody notices until it is expensive.</p></Reveal>
        <ul className="lp-rules">
          {hiding.map((h, i) => <li key={h.n}><Reveal delay={i * 70}><span className="lp-mono">{h.n}</span><b>{h.t}</b><em>{h.d}</em></Reveal></li>)}
        </ul>
      </div>
    </div>
  </section>
}

/* ---------- 3. ingest: slate + glass ---------- */

function Ingest() {
  return <section className="lp-section lp-dark lp-slate lp-ingest" aria-labelledby="lp-ingest-h">
    <div className="lp-dark-bg" aria-hidden="true" />
    <div className="lp-inner">
      <div className="lp-ingest-top">
        <Reveal className="lp-ingest-title">
          <p className="lp-mono lp-eyebrow">02 — Bring it together</p>
          <h2 className="lp-h2" id="lp-ingest-h">Files and links, <span>one shared workspace.</span></h2>
        </Reveal>
        <Reveal className="lp-glass lp-spec" delay={120}>
          <p className="lp-mono lp-spec-title">What you can add</p>
          <dl>
            <div><dt>Files</dt><dd>PDF, Markdown, text</dd></div>
            <div><dt>Size</dt><dd>Up to 20 MB each</dd></div>
            <div><dt>Links</dt><dd>Any http or https address</dd></div>
            <div><dt>Read for answers</dt><dd>Markdown and text files today</dd></div>
          </dl>
        </Reveal>
      </div>
      <div className="lp-steel lp-steel-dark lp-columns">
        <Reveal><b>Workspaces</b><p>One home per project or team, kept separate from every other.</p></Reveal>
        <Reveal delay={90}><b>Sub-workspaces</b><p>Break a program into subsystems without losing the parent context.</p></Reveal>
        <Reveal delay={180}><b>Collections</b><p>Group related sources so questions start from the right material.</p></Reveal>
      </div>
    </div>
  </section>
}

/* ---------- 4. connected intelligence ---------- */

const demoQuestions: { q: string; sources: string[]; a: string; excerpt: string }[] = [
  { q: 'What clearance does the actuator housing need?', sources: ['Interface Drawing · Rev C', 'Assembly Specification · Rev B'],
    a: 'The housing needs 2 mm of radial clearance on all sides. The interface drawing defines it, and the assembly specification repeats it for the installed configuration.',
    excerpt: '“Radial clearance to housing wall: 2 mm minimum, all sides.” — Interface Drawing, section 4.2' },
  { q: 'Which tests cover the thermal limits?', sources: ['Test Report · Run 14', 'Design Review Notes'],
    a: 'Thermal soak runs are documented in the test report, and the pass criteria they were checked against are recorded in the design review notes.',
    excerpt: '“Pass criteria for thermal soak agreed at review; see run table.” — Design Review Notes' },
  { q: 'What changed in the latest revision?', sources: ['Design Review Notes', 'Interface Drawing · Rev C'],
    a: 'The review notes record the bore change requested at the last review, and the interface drawing carries the updated revision marker.',
    excerpt: '“Bore diameter updated following review action 7.” — Design Review Notes' },
]

function Intelligence() {
  const [i, setI] = useState(0)
  const cur = demoQuestions[i]!
  return <section className="lp-section lp-intel" aria-labelledby="lp-intel-h">
    <div className="lp-inner">
      <div className="lp-intel-grid">
        <Reveal className="lp-intel-left">
          <p className="lp-mono lp-eyebrow">03 — Connected intelligence</p>
          <h2 className="lp-h2" id="lp-intel-h">Ask once. <span>See where it came from.</span></h2>
          <ol className="lp-qlist" aria-label="Example questions">
            {demoQuestions.map((d, n) => <li key={d.q}><button type="button" aria-pressed={n === i} onClick={() => setI(n)}><span className="lp-mono">0{n + 1}</span>{d.q}</button></li>)}
          </ol>
        </Reveal>
        <Reveal className="lp-steel lp-answer-panel" delay={100}>
          <div key={i} className="lp-answer-inner" aria-live="polite">
            <p className="lp-mono lp-answer-label">Answer · illustrative example</p>
            <p className="lp-answer-text">{cur.a}</p>
            <div className="lp-cited">
              <p className="lp-mono">Cited sources</p>
              <ul>{cur.sources.map((s, n) => <li key={s}><b className="lp-mono">{n + 1}</b>{s}</li>)}</ul>
            </div>
            <details className="lp-details">
              <summary>Show the supporting excerpt</summary>
              <p>{cur.excerpt}</p>
            </details>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
}

/* ---------- 5. radar ---------- */

function Radar() {
  const [ref, seen] = useInView<HTMLDivElement>(0.4)
  const [run, setRun] = useState(0)
  const [hover, setHover] = useState<'a' | 'b' | null>(null)
  return <section className="lp-section lp-radar" aria-labelledby="lp-radar-h">
    <div className="lp-inner">
      <div className="lp-radar-head">
        <Reveal><p className="lp-mono lp-eyebrow">04 — Engineering Change Radar</p><h2 className="lp-h2" id="lp-radar-h">Two sources. <span>One number that doesn’t match.</span></h2></Reveal>
        <Reveal delay={100}><p className="lp-body">When sources disagree, Footprint surfaces the difference with the evidence behind it, so your team can review it. It does not decide which source is right.</p></Reveal>
      </div>
      <div className="lp-steel lp-measure" ref={ref} key={run} data-shown={seen} data-hover={hover ?? ''}>
        <div className="lp-mrow lp-mrow-a" onPointerEnter={() => setHover('a')} onPointerLeave={() => setHover(null)}>
          <div className="lp-mlabel"><span className="lp-mono"><FileText size={13} aria-hidden="true" /> Interface Drawing · Rev C · §4.2</span><strong>8<small>mm</small></strong></div>
          <div className="lp-mtrack"><i className="lp-mbar" style={v({ '--w': 0.8 })} /></div>
        </div>
        <div className="lp-mrow lp-mrow-b" onPointerEnter={() => setHover('b')} onPointerLeave={() => setHover(null)}>
          <div className="lp-mlabel"><span className="lp-mono"><FileText size={13} aria-hidden="true" /> Assembly Specification · Rev B · §2.1</span><strong>10<small>mm</small></strong></div>
          <div className="lp-mtrack"><i className="lp-mbar" style={v({ '--w': 1 })} /></div>
        </div>
        <div className="lp-mzone" aria-hidden="true"><span className="lp-mono">2 mm</span></div>
        <div className="lp-mscale lp-mono" aria-hidden="true">{[0, 2, 4, 6, 8, 10].map(n => <span key={n}>{n}</span>)}</div>
        <div className="lp-verdict" role="status"><AlertTriangle size={18} aria-hidden="true" /><span><b>Potential conflict — review required.</b> The two sources differ by 2 mm.</span></div>
      </div>
      <div className="lp-radar-foot">
        <div className="lp-expand">
          <details className="lp-details"><summary>What Footprint compares</summary><p>Claims extracted from each source — a subject, an attribute, a value and a unit, with the excerpt they came from — are compared across the workspace. Possible conflicts, changed constraints, interface mismatches and unsupported assumptions are raised for review.</p></details>
          <details className="lp-details"><summary>What your team can do</summary><p>Open both sources and their evidence side by side, then mark the alert reviewed, resolved, or dismissed. Nothing is changed in your documents.</p></details>
        </div>
        <button type="button" className="lp-btn lp-btn-ghost" onClick={() => setRun(r => r + 1)}><RotateCcw size={15} aria-hidden="true" /> Replay</button>
      </div>
    </div>
  </section>
}

/* ---------- 6. security + conclusion ---------- */

const claims = [
  { n: '01', h: 'Your account.', t: 'Sign-in is required to reach your workspaces, and every request is made as you.' },
  { n: '02', h: 'Your workspace.', t: 'Sources and what is derived from them are accessible only to the workspace owner.' },
  { n: '03', h: 'Your sources.', t: 'Answers draw on the active workspace and cite what they used. Remove a source, and its uploaded file, whenever you choose.' },
] as const

function Security({ onOpen }: { onOpen: OpenHandler }) {
  return <section className="lp-section lp-dark lp-slate lp-security" aria-labelledby="lp-sec-h">
    <div className="lp-dark-bg" aria-hidden="true" />
    <div className="lp-inner">
      <Reveal><p className="lp-mono lp-eyebrow">05 — Security</p><h2 className="lp-h2 lp-sec-h2" id="lp-sec-h">Your engineering information <span>stays in your workspace.</span></h2></Reveal>
      <ol className="lp-claims">
        {claims.map((c, i) => <li key={c.n}><Reveal delay={i * 90}><span className="lp-mono">{c.n}</span><b>{c.h}</b><p>{c.t}</p></Reveal></li>)}
      </ol>
      <Link to="/security" className="lp-textlink">Read the security details <ArrowUpRight size={15} aria-hidden="true" /></Link>
      <Reveal className="lp-glass lp-closing">
        <h2 className="lp-h2">Give your team <span>one place to start.</span></h2>
        <div className="lp-actions">
          <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onOpen}>Open Footprint <ArrowRight size={18} aria-hidden="true" /></Link>
          <Link to="/how-it-works" className="lp-btn lp-btn-dark lp-btn-lg">See how it works</Link>
        </div>
      </Reveal>
      <footer className="lp-footer">
        <Link to="/" className="lp-brand" aria-label="Footprint home"><Mark size={16} /><span>Footprint</span></Link>
        <nav aria-label="Footer navigation">{nav.map(n => <Link key={n.to} to={n.to} className="lp-nav-link">{n.label}</Link>)}</nav>
      </footer>
    </div>
  </section>
}

/* ---------- page ---------- */

export function Landing() {
  const { open, reveal } = useOpenApp()
  return <div className="lp">
    <Header onOpen={open} />
    <main>
      <Hero onOpen={open} />
      <Problem />
      <Ingest />
      <Intelligence />
      <Radar />
      <Security onOpen={open} />
    </main>
    <div className="lp-reveal" data-on={reveal} aria-hidden="true" />
  </div>
}
