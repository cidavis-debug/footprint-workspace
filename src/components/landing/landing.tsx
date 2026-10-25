import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, ArrowUpRight, FileText, FolderOpen, RotateCcw } from 'lucide-react'
import { Header, Mark, Plane, Reveal, Stage, WordReveal, clamp, nav, prefersReducedMotion, smooth, useInView, useOpenApp, useScrollProgress, v, type OpenHandler } from './shared'

/* ---------- 1. hero: puzzle zoom, scrubbed by scroll ---------- */

// Prepared puzzle: the ceramic board without its centre mark, plus a hi-res Footprint mark laid over the centre piece
// (same placement as the title slide of the investor deck). The mark is a separate layer so it stays crisp at ~20x zoom.
const PUZZLE_SRC = '/puzzle/puzzle-base.webp'
const PUZZLE_MARK_SRC = '/puzzle/puzzle-foot.png'
// Zoom target: the solid "ball" of the foot, as a fraction of the square board.
const BALL_X = 0.5024, BALL_Y = 0.4562
// Ball is ~0.097 of the board wide and ~0.061 tall; the zoom ends once it covers the viewport.
const BALL_W = 0.097, BALL_H = 0.061

function Hero({ onOpen }: { onOpen: OpenHandler }) {
  const outer = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = outer.current
    if (!el) return
    const set = (k: string, val: number | string) => el.style.setProperty(k, String(val))

    // Scroll budget: REVEAL_VH of travel to uncover the puzzle, then ZOOM_VH of travel for zoom, orange, and the grey dot.
    // Keep these in sync with the .lp-hero height in landing.css (100vh + both = 222vh).
    const REVEAL_VH = 0.26, ZOOM_VH = 0.96

    let vh = window.innerHeight, vw = window.innerWidth, reveal = REVEAL_VH * vh, shiftPx = 0, offX = 0, size = 0, zoomMax = 1, panX = 0, panY = 0
    const measure = () => {
      vh = window.innerHeight; vw = window.innerWidth; reveal = REVEAL_VH * vh
      const mobile = vw <= 640
      size = mobile ? Math.min(vw * 0.94, vh * 0.52) : Math.min(vh * 0.8, vw * 0.9)
      // The puzzle only ever moves vertically: it starts to the right of the copy (desktop) or under it (mobile), ~55% of it
      // above the bottom edge, and rises into view. It never moves sideways. The zoom then does all the travel: it scales
      // around the foot while panning the foot to the middle of the screen, so the grey dot can grow from the true centre.
      offX = mobile ? 0 : vw * 0.2
      shiftPx = mobile ? vh * 0.3 : Math.max(0, vh - (vh - size) / 2 - 0.55 * size)
      // Where the ball sits on screen once the puzzle has finished rising.
      const cx = vw / 2 + offX + (BALL_X - 0.5) * size, cy = vh / 2 + (BALL_Y - 0.5) * size
      panX = vw / 2 - cx; panY = vh / 2 - cy
      // Zoom until the ball, now centred, covers the whole viewport.
      zoomMax = Math.max(vw / (BALL_W * size), vh / (BALL_H * size)) * 1.08
      set('--dot', `${(Math.hypot(vw, vh) + 8).toFixed(1)}px`)
      set('--size', `${size.toFixed(1)}px`)
      set('--px', `${offX.toFixed(1)}px`)
      set('--ball-x', `${(BALL_X * 100).toFixed(2)}%`)
      set('--ball-y', `${(BALL_Y * 100).toFixed(2)}%`)
    }
    measure()

    const apply = (y: number) => {
      const r = clamp(y / reveal)
      const t = clamp((y - reveal) / (ZOOM_VH * vh))
      const re = smooth(r)
      // 0..0.62 of the travel zooms into the foot (exponential, so it feels even), then orange holds, then the dot grows.
      const z = smooth(t / 0.62)
      set('--shift', `${(shiftPx * (1 - re)).toFixed(1)}px`)
      set('--edge', (1 - re).toFixed(4))
      set('--text', (1 - smooth((r - 0.3) / 0.6)).toFixed(4))
      set('--zoom', Math.exp(Math.log(zoomMax) * z).toFixed(3))
      set('--tx', `${(panX * z).toFixed(1)}px`)
      set('--ty', `${(panY * z).toFixed(1)}px`)
      set('--fill', smooth((t - 0.36) / 0.24).toFixed(4))
      set('--grow', smooth((t - 0.64) / 0.36).toFixed(4))
      el.dataset['phase'] = r < 1 ? 'reveal' : 'zoom'
    }

    // Paint the correct starting layout immediately, before the first scroll frame.
    if (prefersReducedMotion()) { apply(reveal); return }
    apply(Math.max(0, -el.getBoundingClientRect().top))

    let target = 0, shown = 0, raf = 0, running = true, last = performance.now()
    const frame = (now: number) => {
      if (!running) return
      const dt = Math.min(64, now - last); last = now
      target = Math.max(0, -el.getBoundingClientRect().top)
      // time-based exponential smoothing: identical feel at 60 and 144 Hz, quick catch-up on fast scrolls
      shown += (target - shown) * (1 - Math.exp(-dt / 70))
      if (Math.abs(target - shown) < 0.3) shown = target
      apply(shown)
      raf = requestAnimationFrame(frame)
    }
    const onResize = () => { measure(); apply(shown) }
    window.addEventListener('resize', onResize)
    raf = requestAnimationFrame(frame)
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  return <section className="lp-hero" ref={outer}>
    <div className="lp-hero-sticky">
      <div className="lp-puzzle">
        <div className="lp-puzzle-box">
          <img className="lp-puzzle-base" src={PUZZLE_SRC} alt="" width={1254} height={1254} decoding="async" fetchPriority="high" draggable={false} aria-hidden="true" />
          <img className="lp-puzzle-mark" src={PUZZLE_MARK_SRC} alt="" decoding="async" draggable={false} aria-hidden="true" />
        </div>
      </div>
      <div className="lp-floor" aria-hidden="true" />
      <div className="lp-fill" aria-hidden="true" />
      <div className="lp-dotwrap" aria-hidden="true"><div className="lp-dot" /></div>
      <div className="lp-inner lp-hero-inner">
        <div className="lp-hero-copy">
          <p className="lp-mono lp-eyebrow">For hardware engineering teams</p>
          <h1 className="lp-h1">Complex Engineering. <span>Connected Intelligence.</span></h1>
          <p className="lp-lead">Footprint AI is the source of truth for hardware engineering knowledge. It connects your teams’ sources, answers with citations, and catches conflicts before they become redesigns.</p>
          <div className="lp-actions">
            <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onOpen}>Open Footprint AI <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link to="/how-it-works" className="lp-btn lp-btn-ghost lp-btn-lg">See how it works</Link>
          </div>
          <ul className="lp-trio">
            <li><FolderOpen size={18} aria-hidden="true" /> Connect sources</li>
            <li><FileText size={18} aria-hidden="true" /> Ask with citations</li>
            <li><AlertTriangle size={18} aria-hidden="true" /> Catch conflicts</li>
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
  return <Stage className="lp-section lp-problem" aria-labelledby="lp-problem-h">
    <div className="lp-inner">
      <p className="lp-mono lp-eyebrow">01 — The problem</p>
      <h2 id="lp-problem-h" className="lp-sr">The problem</h2>
      <WordReveal className="lp-statement" text="The answer exists. It’s spread across drawings, requirements, test reports, and decisions — and teams lose time rebuilding context instead of using it." />
      <div className="lp-split-text">
        <Reveal dir="none"><p className="lp-body">Every hardware program accumulates documents that each hold part of the truth. When they drift apart, nobody notices until it is expensive.</p></Reveal>
        <Reveal dir="slide-r" className="arc-plate arc-f-steel arc-inset arc-bleed-r lp-rules-slab">
          <ul className="lp-rules">
            {hiding.map(h => <li key={h.n}><div><span className="lp-mono">{h.n}</span><b>{h.t}</b><em>{h.d}</em></div></li>)}
          </ul>
        </Reveal>
      </div>
    </div>
  </Stage>
}

/* ---------- 3. ingest: slate + glass ---------- */

function Ingest() {
  return <Stage className="lp-section lp-dark lp-slate lp-ingest arc-sec arc-wt arc-wb arc-t-l arc-b-r" aria-labelledby="lp-ingest-h">
    <div className="lp-dark-bg" aria-hidden="true" />
    <i className="arc-tiband" aria-hidden="true" />
    <div className="lp-inner">
      <div className="lp-ingest-top">
        <Reveal dir="none" className="lp-ingest-title">
          <p className="lp-mono lp-eyebrow">02 — Bring it together</p>
          <h2 className="lp-h2" id="lp-ingest-h">Every source, <span>one shared workspace.</span></h2>
        </Reveal>
        <Reveal dir="slide-r" className="lp-lit lp-glass lp-spec" delay={120}>
          <p className="lp-mono lp-spec-title">What Footprint connects</p>
          <dl>
            <div><dt>Files</dt><dd>PDF, Word, Excel, PPT, MD, TXT</dd></div>
            <div><dt>Sync</dt><dd>Superfolders stay current</dd></div>
            <div><dt>Links</dt><dd>Public http or https pages</dd></div>
            <div><dt>Routing</dt><dd>Slack and Teams</dd></div>
          </dl>
        </Reveal>
      </div>
      <div className="lp-steel lp-steel-dark lp-columns">
        <Reveal dir="fade"><b>Workspaces</b><p>Shared team workspaces: one home per program, every engineer on the same page.</p></Reveal>
        <Reveal dir="fade" delay={90}><b>Sub-workspaces</b><p>Break a program into subsystems without losing the parent context.</p></Reveal>
        <Reveal dir="fade" delay={180}><b>Superfolders</b><p>Pull in files, folders and notes from your tools and keep them in sync.</p></Reveal>
      </div>
    </div>
  </Stage>
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
  return <Stage className="lp-section lp-intel" aria-labelledby="lp-intel-h">
    <div className="lp-inner">
      <div className="lp-intel-grid">
        <Reveal dir="none" className="lp-intel-left">
          <p className="lp-mono lp-eyebrow">03 — Connected intelligence</p>
          <h2 className="lp-h2" id="lp-intel-h">Ask once. <span>See where it came from.</span></h2>
          <ol className="lp-qlist" aria-label="Example questions">
            {demoQuestions.map((d, n) => <li key={d.q}><button type="button" aria-pressed={n === i} onClick={() => setI(n)}><span className="lp-mono">0{n + 1}</span>{d.q}</button></li>)}
          </ol>
        </Reveal>
        <div className="arc-overlap">
        <i className="arc-plate arc-f-steel arc-slab" aria-hidden="true" />
        <Reveal dir="slide-u" className="lp-lit lp-glass-light lp-answer-panel" delay={100}>
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
    </div>
  </Stage>
}

/* ---------- 5. radar ---------- */

function Radar() {
  const [ref, seen] = useInView<HTMLDivElement>(0.4)
  const [run, setRun] = useState(0)
  const [hover, setHover] = useState<'a' | 'b' | null>(null)
  return <Stage className="lp-section lp-radar arc-sec arc-wt arc-t-r arc-b-l" aria-labelledby="lp-radar-h">
    <div className="arc-bg arc-bg-steel" aria-hidden="true" />
    <div className="lp-inner">
      <div className="lp-radar-head">
        <Reveal dir="none"><p className="lp-mono lp-eyebrow">04 — Engineering Change Radar</p><h2 className="lp-h2" id="lp-radar-h">Two sources. <span>One number that doesn’t match.</span></h2></Reveal>
        <Reveal dir="none" delay={100}><p className="lp-body">When sources disagree, Footprint AI surfaces the difference with the evidence behind it, so your team can review it. It does not decide which source is right.</p></Reveal>
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
          <details className="lp-details"><summary>What Footprint AI compares</summary><p>Claims extracted from each source — a subject, an attribute, a value and a unit, with the excerpt they came from — are compared across the workspace. Possible conflicts, interface mismatches, EBOM-to-MBOM differences and unsupported assumptions are raised for review, each with a confidence level and, where possible, a likely out-of-date source.</p></details>
          <details className="lp-details"><summary>What your team can do</summary><p>Open both sources and their evidence side by side, route the issue to the right engineers in Slack or Teams, and draft the change order. Nothing is changed in your documents.</p></details>
        </div>
        <button type="button" className="lp-btn lp-btn-ghost" onClick={() => setRun(r => r + 1)}><RotateCcw size={15} aria-hidden="true" /> Replay</button>
      </div>
    </div>
  </Stage>
}

/* ---------- 6. security + conclusion ---------- */

const claims = [
  { n: '01', h: 'Your account.', t: 'Sign-in is required to reach your workspaces, and every request is made as you.' },
  { n: '02', h: 'Your workspace.', t: 'Sources and what is derived from them stay inside your workspace, shared only with the teammates you add.' },
  { n: '03', h: 'Your sources.', t: 'Answers draw on the active workspace and cite what they used. Remove a source, and its uploaded file, whenever you choose.' },
] as const

function Security({ onOpen }: { onOpen: OpenHandler }) {
  return <Stage className="lp-section lp-dark lp-slate lp-security arc-sec arc-wt arc-t-r arc-pull" aria-labelledby="lp-sec-h">
    <div className="lp-dark-bg" aria-hidden="true" />
    <Plane className="arc-plane-closing" speed={0} />
    <div className="lp-inner">
      <Reveal dir="slide-l"><p className="lp-mono lp-eyebrow">05 — Security</p><h2 className="lp-h2 lp-sec-h2" id="lp-sec-h">Your engineering information <span>stays in your workspace.</span></h2></Reveal>
      <ol className="lp-claims">
        {claims.map((c, i) => <li key={c.n}><Reveal dir="slide-d" delay={i * 90}><span className="lp-mono">{c.n}</span><b>{c.h}</b><p>{c.t}</p></Reveal></li>)}
      </ol>
      <Link to="/security" className="lp-textlink">Read the security details <ArrowUpRight size={15} aria-hidden="true" /></Link>
      <Reveal dir="slide-u" className="lp-lit lp-glass lp-closing">
        <h2 className="lp-h2">Give your team <span>one place to start.</span></h2>
        <div className="lp-actions">
          <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onOpen}>Open Footprint AI <ArrowRight size={18} aria-hidden="true" /></Link>
          <Link to="/how-it-works" className="lp-btn lp-btn-dark lp-btn-lg">See how it works</Link>
        </div>
      </Reveal>
      <footer className="lp-footer">
        <Link to="/" className="lp-brand" aria-label="Footprint AI home"><Mark size={16} /><span>Footprint AI</span></Link>
        <nav aria-label="Footer navigation">{nav.map(n => <Link key={n.to} to={n.to} className="lp-nav-link">{n.label}</Link>)}</nav>
      </footer>
    </div>
  </Stage>
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
