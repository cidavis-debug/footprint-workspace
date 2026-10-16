import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, ArrowUpRight, FileText, FolderOpen, RotateCcw } from 'lucide-react'
import { Header, Mark, Reveal, WordReveal, clamp, nav, prefersReducedMotion, smooth, useInView, useOpenApp, useScrollProgress, v, type OpenHandler } from './shared'

/* ---------- 1. hero: mechanical bloom, scrubbed by scroll ---------- */

const BLOOM_SRC = '/Footprint AI — Mechanical Bloom Zoom Transition.mp4'
const BLOOM_POSTER = '/footprint-bloom-poster.jpg'
// Pre-rendered stills of the bloom video (92 frames across its full length). Scrubbing paints these onto a canvas,
// which is far smoother than seeking a compressed video on every scroll event. The video file itself is unchanged.
const BLOOM_FRAMES = 92
const bloomFrame = (i: number) => `/bloom/f${String(i).padStart(3, '0')}.jpg`

function Hero({ onOpen }: { onOpen: OpenHandler }) {
  const outer = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = outer.current, vid = video.current, cv = canvas.current
    if (!el || !vid || !cv) return
    const set = (k: string, val: number | string) => el.style.setProperty(k, String(val))
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    // Scroll budget: REVEAL_VH of travel to uncover the flower, then BLOOM_VH of travel to scrub the video.
    // Keep these in sync with the .lp-hero height in landing.css (100vh + both = 222vh).
    const REVEAL_VH = 0.26, BLOOM_VH = 0.96

    let vh = window.innerHeight, vw = window.innerWidth, reveal = REVEAL_VH * vh, shiftPx = 0, objX = 50
    const measure = () => {
      vh = window.innerHeight; vw = window.innerWidth; reveal = REVEAL_VH * vh
      // Rendered video frame under object-fit: cover (frame is 16:9).
      const frameH = Math.max(vh, vw * 9 / 16), frameW = Math.max(vw, vh * 16 / 9)
      if (vw <= 640) { shiftPx = vh * 0.24; objX = 76; return }
      // Push the frame down until ~55% of the flower (frame y 4%..96%) is above the bottom edge.
      shiftPx = Math.max(0, vh - (vh - frameH) / 2 - (0.04 + 0.92 * 0.55) * frameH)
      // On narrower-than-16:9 viewports keep the flower in view on the right while the frame is cropped.
      const crop = frameW - vw
      objX = crop > 1 ? clamp(-(0.66 * vw - 0.64 * frameW) / crop, 0, 1) * 100 : 50
    }
    measure()

    const apply = (y: number) => {
      const r = clamp(y / reveal)
      const t = clamp((y - reveal) / (BLOOM_VH * vh))
      const re = smooth(r)
      set('--shift', `${(shiftPx * (1 - re)).toFixed(1)}px`)
      set('--scale', (1 + 0.1 * (1 - re)).toFixed(4))
      set('--edge', (1 - re).toFixed(4))
      set('--text', (1 - smooth((r - 0.3) / 0.6)).toFixed(4))
      set('--t', t.toFixed(4))
      set('--wash', smooth((t - 0.86) / 0.14).toFixed(4))
      set('--grow', smooth(t / 0.3).toFixed(4))
      el.dataset['phase'] = r < 1 ? 'reveal' : 'bloom'
      cv.style.objectPosition = vid.style.objectPosition = `${lerp(objX, 50, re).toFixed(1)}% center`
      return t
    }

    // --- frame sequence -> canvas ---
    const frames: (HTMLImageElement | null)[] = new Array(BLOOM_FRAMES).fill(null)
    const ctx = cv.getContext('2d', { alpha: false })
    cv.width = 1152; cv.height = 648
    let drawn = -1, alive = true
    const paint = (pos: number) => {
      if (!ctx) return
      const key = Math.round(pos * 20) // repaint only when the blend visibly changes
      if (key === drawn) return
      const i0 = Math.min(BLOOM_FRAMES - 1, Math.floor(pos)), a = pos - i0
      const at = (i: number) => { for (let k = i; k >= 0; k--) if (frames[k]) return frames[k]; return null }
      const f0 = at(i0)
      if (!f0) return
      drawn = key
      ctx.globalAlpha = 1
      ctx.drawImage(f0, 0, 0, cv.width, cv.height)
      const f1 = i0 + 1 < BLOOM_FRAMES ? frames[i0 + 1] : null
      if (f1 && a > 0.04) { ctx.globalAlpha = a; ctx.drawImage(f1, 0, 0, cv.width, cv.height); ctx.globalAlpha = 1 }
    }
    let pos = 0
    const load = (i: number) => new Promise<void>(res => {
      const im = new Image()
      im.decoding = 'async'
      im.onload = () => { frames[i] = im; if (alive) { drawn = -1; paint(pos) } res() }
      im.onerror = () => res()
      im.src = bloomFrame(i)
    })
    void (async () => {
      await load(0)
      // load in coarse-to-fine order so scrubbing works early: every 8th frame, then the gaps
      const order: number[] = []
      for (const step of [8, 4, 2, 1]) for (let i = 0; i < BLOOM_FRAMES; i += step) if (!order.includes(i)) order.push(i)
      for (let k = 0; k < order.length && alive; k += 6) await Promise.all(order.slice(k, k + 6).map(load))
    })()

    if (prefersReducedMotion()) { apply(reveal); paint(0); return }

    let target = 0, shown = 0, raf = 0, running = true, last = performance.now()
    const frame = (now: number) => {
      if (!running) return
      const dt = Math.min(64, now - last); last = now
      target = Math.max(0, -el.getBoundingClientRect().top)
      // time-based exponential smoothing: identical feel at 60 and 144 Hz, quick catch-up on fast scrolls
      shown += (target - shown) * (1 - Math.exp(-dt / 70))
      if (Math.abs(target - shown) < 0.3) shown = target
      const t = apply(shown)
      pos = t * (BLOOM_FRAMES - 1)
      paint(pos)
      raf = requestAnimationFrame(frame)
    }
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    raf = requestAnimationFrame(frame)
    return () => { running = false; alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  return <section className="lp-hero" ref={outer}>
    <div className="lp-hero-sticky">
      <div className="lp-bloom">
        <video ref={video} className="lp-bloom-video" src={encodeURI(BLOOM_SRC)} poster={BLOOM_POSTER} muted playsInline preload="none" aria-hidden="true" tabIndex={-1} />
        <canvas ref={canvas} className="lp-bloom-canvas" aria-hidden="true" />
      </div>
      <div className="lp-floor" aria-hidden="true" />
      <div className="lp-wash" aria-hidden="true" />
      <div className="lp-inner lp-hero-inner">
        <div className="lp-hero-copy">
          <p className="lp-mono lp-eyebrow">For hardware engineering teams</p>
          <h1 className="lp-h1">Complex Engineering. <span>Connected Intelligence.</span></h1>
          <p className="lp-lead">Footprint AI helps hardware engineering teams organize information, ask questions across their sources, and identify potential inconsistencies before they become expensive.</p>
          <div className="lp-actions">
            <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onOpen}>Open Footprint AI <ArrowRight size={18} aria-hidden="true" /></Link>
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
        <Reveal delay={100}><p className="lp-body">When sources disagree, Footprint AI surfaces the difference with the evidence behind it, so your team can review it. It does not decide which source is right.</p></Reveal>
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
          <details className="lp-details"><summary>What Footprint AI compares</summary><p>Claims extracted from each source — a subject, an attribute, a value and a unit, with the excerpt they came from — are compared across the workspace. Possible conflicts, changed constraints, interface mismatches and unsupported assumptions are raised for review.</p></details>
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
          <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onOpen}>Open Footprint AI <ArrowRight size={18} aria-hidden="true" /></Link>
          <Link to="/how-it-works" className="lp-btn lp-btn-dark lp-btn-lg">See how it works</Link>
        </div>
      </Reveal>
      <footer className="lp-footer">
        <Link to="/" className="lp-brand" aria-label="Footprint AI home"><Mark size={16} /><span>Footprint AI</span></Link>
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
