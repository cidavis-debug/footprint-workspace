import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Rv, prefersReducedMotion, useCycle, useInView } from '@/ui/marketing/interactive'

const A = '/landing'

export const NAV = [
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/collections', label: 'Collections' },
  { to: '/security', label: 'Security' },
  { to: '/pricing', label: 'Pricing' },
] as const

/** Carries the last frame of the preceding video into a section, fading to the page background. */
function Bridge({ image, side = 'full' }: { image: string; side?: 'full' | 'left' }) {
  return <div className={`cin-bridge cin-bridge-${side}`} aria-hidden="true"><img src={`${A}/${image}`} alt="" loading="lazy" /></div>
}

function Chapter({ n, name }: { n: string; name: string }) {
  return <Rv as="p" className="cin-chapter"><span className="cin-mono">{n}</span><i aria-hidden="true" />{name}</Rv>
}

/* ============================ A. Problem ============================ */

const FRAGMENTS = [
  { kind: 'Drawing · rev C', text: 'Mounting bore Ø 8 mm', x: 3, y: 6, d: 1.1, r: -3, hot: true },
  { kind: 'Specification · rev D', text: 'Mounting bore Ø 10 mm', x: 50, y: 0, d: 1.6, r: 2, hot: true },
  { kind: 'Requirement', text: 'Housing shall operate from −40 °C to +85 °C', x: 12, y: 38, d: 0.8, r: 1.5 },
  { kind: 'Test report', text: 'Thermal soak completed at −20 °C', x: 56, y: 36, d: 1.3, r: -2 },
  { kind: 'Team thread', text: '“Did the bracket change after the review?”', x: 22, y: 68, d: 1.5, r: 2.5 },
  { kind: 'Decision log', text: 'Option B approved, pending thermal data', x: 60, y: 70, d: 0.9, r: -1.5 },
]

function Scatter() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return
    let raf = 0
    let nx = 0
    let ny = 0
    const apply = () => { raf = 0; el.style.setProperty('--rx', nx.toFixed(3)); el.style.setProperty('--ry', ny.toFixed(3)) }
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      nx = Math.max(-1.2, Math.min(1.2, ((e.clientX - r.left) / r.width - 0.5) * 2))
      ny = Math.max(-1.2, Math.min(1.2, ((e.clientY - r.top) / r.height - 0.5) * 2))
      if (!raf) raf = requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => { window.removeEventListener('pointermove', onMove); if (raf) cancelAnimationFrame(raf) }
  }, [])
  return <div ref={ref} className="cin-scatter" aria-hidden="true">
    <svg className="cin-scatter-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M22 16 C 34 14, 40 8, 54 10" /><path d="M18 46 C 30 52, 44 44, 58 46" /><path d="M30 76 C 42 70, 52 78, 62 78" />
    </svg>
    {FRAGMENTS.map(f => <div key={f.kind} className={`cin-frag cin-glass ${f.hot ? 'is-hot' : ''}`}
      style={{ left: `${f.x}%`, top: `${f.y}%`, '--d': f.d, '--r': `${f.r}deg` } as CSSProperties}>
      <span className="cin-mono">{f.kind}</span>
      <strong>{f.text}</strong>
    </div>)}
    <p className="cin-scatter-note cin-mono">Illustrative</p>
  </div>
}

const PROBLEM_ROW = [
  { n: '01', t: 'Hard to find', b: 'The answer is in a revision or a thread nobody remembers.' },
  { n: '02', t: 'Different assumptions', b: 'Each team holds its own version of an interface or limit.' },
  { n: '03', t: 'Found too late', b: 'A changed dimension surfaces at integration, when it costs the most.' },
]

export function ProblemSection({ bridge }: { bridge?: string }) {
  return <section className="cin-sec cin-sec-problem" id="problem" aria-labelledby="problem-h">
    {bridge && <Bridge image={bridge} />}
    <div className="cin-wrap">
      <div className="cin-problem-grid">
        <div className="cin-problem-copy">
          <Chapter n="01" name="The problem" />
          <Rv as="h2" className="cin-display cin-sec-h" delay={60}><span id="problem-h">The answer exists. It’s just scattered.</span></Rv>
          <Rv as="p" className="cin-lede" delay={120}>On a hardware program, the facts that matter live across drawings, requirements, test reports and team decisions. Each can be right on its own while the whole drifts out of sync.</Rv>
          <Rv as="p" className="cin-audience" delay={180}>Built for the systems, mechanical, electrical and test engineers who keep a program consistent.</Rv>
        </div>
        <Scatter />
      </div>
      <ol className="cin-problem-row" aria-label="What goes wrong">
        {PROBLEM_ROW.map((p, i) => <Rv as="li" key={p.n} delay={i * 80}>
          <span className="cin-mono">{p.n}</span>
          <strong>{p.t}</strong>
          <span>{p.b}</span>
        </Rv>)}
      </ol>
    </div>
  </section>
}

/* ============================ B. Ingestion ============================ */

const INGEST_SOURCES = ['CAD', 'Reports', 'Requirements', 'Test data']

export function IngestionSection() {
  return <section className="cin-sec cin-sec-ingest" id="ingestion" aria-labelledby="ingest-h">
    <div className="cin-wrap">
      <div className="cin-head-split">
        <div>
          <Chapter n="02" name="Ingestion" />
          <Rv as="h2" className="cin-display cin-sec-h" delay={60}><span id="ingest-h">Start with what you already have.</span></Rv>
        </div>
        <Rv as="p" className="cin-lede" delay={120}>Add your files and links, group them into workspaces and collections, and every source stays tied to its original.</Rv>
      </div>

      <Rv className="cin-bento" delay={60}>
        <div className="cin-tile cin-tile-flow cin-glass cin-glow">
          <div className="cin-flow-stage" aria-hidden="true">
            <ul className="cin-flow-sources">
              {INGEST_SOURCES.map((s, i) => <li key={s} className="cin-chip-doc" style={{ '--i': i } as CSSProperties}><i />{s}</li>)}
            </ul>
            <svg className="cin-flow-svg" viewBox="0 0 100 200" preserveAspectRatio="none">
              {[25, 75, 125, 175].map((y, i) => <path key={y} d={`M0 ${y} C 55 ${y}, 45 100, 100 100`} className="cin-flow-path" style={{ animationDelay: `${-i * 0.5}s` }} />)}
            </svg>
            <div className="cin-hub"><span className="cin-hub-ring" /><span className="cin-hub-ring r2" /><b>Workspace</b></div>
          </div>
          <h3>One connected workspace</h3>
          <p>Documents from different disciplines land in the same place, ready to be searched and compared.</p>
        </div>
        <div className="cin-tile cin-tile-files cin-glass cin-glow">
          <span className="cin-mono">Files</span>
          <h3>PDF, Markdown, text</h3>
          <p>Up to 20 MB each. Text and Markdown are analyzed today; PDFs are stored for indexing.</p>
        </div>
        <div className="cin-tile cin-tile-links cin-glass cin-glow">
          <span className="cin-mono">Links</span>
          <h3>Saved as references</h3>
          <p>Keep web sources next to your files so the context travels together.</p>
        </div>
        <div className="cin-tile cin-tile-tree cin-metal">
          <div>
            <span className="cin-mono">Workspaces & collections</span>
            <h3>Organized the way your program is.</h3>
          </div>
          <ul className="cin-tree" aria-label="Example structure">
            <li>Program<ul><li>Structures<ul><li>Brackets</li><li>Housings</li></ul></li><li>Avionics<ul><li>Power</li><li>Interfaces</li></ul></li></ul></li>
          </ul>
        </div>
      </Rv>
      <Rv as="p" className="cin-note" delay={60}>Illustrative categories. Direct integrations with CAD, PLM and issue trackers are a future direction, not available today.</Rv>
    </div>
  </section>
}

/* ============================ C. Intelligence ============================ */

type NodeType = 'Requirements' | 'Drawing' | 'Specification' | 'Test report' | 'Decision' | 'Team thread'
const NODES: Record<string, { x: number; y: number; type: NodeType }> = {
  R1: { x: 170, y: 100, type: 'Requirements' }, R2: { x: 420, y: 62, type: 'Requirements' }, R3: { x: 700, y: 112, type: 'Requirements' },
  D1: { x: 250, y: 252, type: 'Drawing' }, D2: { x: 560, y: 304, type: 'Drawing' },
  S1: { x: 400, y: 200, type: 'Specification' }, S2: { x: 830, y: 232, type: 'Specification' },
  T1: { x: 130, y: 340, type: 'Test report' }, T2: { x: 690, y: 376, type: 'Test report' },
  X1: { x: 565, y: 170, type: 'Decision' }, X2: { x: 920, y: 352, type: 'Decision' },
  C1: { x: 330, y: 372, type: 'Team thread' },
}
const EDGES: [string, string][] = [
  ['R1', 'S1'], ['R1', 'D1'], ['R2', 'S1'], ['R2', 'X1'], ['R3', 'X1'], ['R3', 'S2'], ['D1', 'S1'], ['D1', 'T1'], ['D1', 'C1'],
  ['S1', 'X1'], ['X1', 'D2'], ['D2', 'T2'], ['D2', 'S2'], ['S2', 'X2'], ['T2', 'X2'], ['C1', 'D2'],
]
const QUESTIONS = [
  { q: 'What could constrain this decision?', nodes: ['X1', 'R2', 'R3', 'S1'], a: 'Constraints and earlier decisions that touch the topic, each cited to its source.' },
  { q: 'Do our sources conflict?', nodes: ['D1', 'S1', 'R1'], a: 'Passages that disagree, with both sources side by side.' },
  { q: 'What still needs validating?', nodes: ['R3', 'S2', 'X2', 'T2'], a: 'Assumptions that have no supporting evidence in the workspace yet.' },
  { q: 'What does this change affect?', nodes: ['D2', 'X1', 'S2', 'T2'], a: 'Interfaces and systems linked to the change, with their sources.' },
]

export function IntelligenceSection({ bridge }: { bridge?: string }) {
  const stage = useRef<HTMLDivElement>(null)
  const inView = useInView(stage, 0.3)
  const [hover, setHover] = useState(false)
  const [manualPause, setManualPause] = useState(false)
  const [i, setI] = useCycle(QUESTIONS.length, { active: inView, paused: hover || manualPause, interval: 5500 })
  const current = QUESTIONS[i]!
  const lit = new Set(current.nodes)
  const sources = [...new Set(current.nodes.map(n => NODES[n]!.type))]

  return <section className="cin-sec cin-sec-intel" id="intelligence" aria-labelledby="intel-h">
    {bridge && <Bridge image={bridge} side="left" />}
    <div className="cin-wrap">
      <div className="cin-head-split cin-head-right">
        <div>
          <Chapter n="03" name="Connected intelligence" />
          <Rv as="h2" className="cin-display cin-sec-h" delay={60}><span id="intel-h">Find the answers hidden in your engineering data.</span></Rv>
        </div>
        <Rv as="p" className="cin-lede" delay={120}>Ask in plain language. Footprint answers from the sources in your workspace, cites them, and lets you open the evidence behind every claim.</Rv>
      </div>

      <Rv delay={60}>
        <div ref={stage} className="cin-netstage cin-glass" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
          <svg className="cin-net" viewBox="0 0 1000 440" role="img" aria-label="Illustrative network of connected engineering sources">
            {EDGES.map(([a, b]) => {
              const on = lit.has(a) && lit.has(b)
              const pa = NODES[a]!, pb = NODES[b]!
              return <line key={a + b} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className={`cin-edge ${on ? 'is-on' : ''}`} />
            })}
            {Object.entries(NODES).map(([id, n], k) => <g key={id} className={`cin-node ${lit.has(id) ? 'is-on' : ''}`} style={{ '--k': k } as CSSProperties}>
              <circle cx={n.x} cy={n.y} r={lit.has(id) ? 10 : 6} />
              <text x={n.x + 16} y={n.y + 5}>{n.type}</text>
            </g>)}
          </svg>
          <ul className="cin-qlist" aria-label="Example questions">
            {QUESTIONS.map((x, k) => <li key={x.q}>
              <button type="button" aria-pressed={k === i} onClick={() => setI(k)}><span className="cin-mono">{String(k + 1).padStart(2, '0')}</span>{x.q}</button>
            </li>)}
          </ul>
          <div className="cin-answer">
            <p>{current.a}</p>
            <ul className="cin-tags" aria-label="Draws on">{sources.map(s => <li key={s}>{s}</li>)}</ul>
          </div>
          <button type="button" className="cin-pause" aria-pressed={manualPause} onClick={() => setManualPause(p => !p)}>{manualPause ? 'Resume' : 'Pause'}</button>
        </div>
        <p className="cin-note">Illustrative. The full interface opens when you launch Footprint. <Link to="/how-it-works" className="cin-inline-link">See how it works →</Link></p>
      </Rv>
    </div>
  </section>
}

/* ============================ D. Change Radar ============================ */

type RadarView = 'a' | 'b' | 'compare'

function RadarDiagram({ view }: { view: RadarView }) {
  const showA = view === 'a' || view === 'compare'
  const showB = view === 'b' || view === 'compare'
  const cmp = view === 'compare'
  const ring = 'M220 190 m-80 0 a80 80 0 1 0 160 0 a80 80 0 1 0 -160 0 M220 190 m-64 0 a64 64 0 1 0 128 0 a64 64 0 1 0 -128 0'
  return <svg className="cin-rdiagram" viewBox="0 0 440 400" role="img" aria-label={`Mounting bore diagram. ${showA ? 'Interface Drawing shows 8 millimetres. ' : ''}${showB ? 'Assembly Specification shows 10 millimetres.' : ''}`}>
    <g className="cin-r-axes"><line x1="40" y1="190" x2="400" y2="190" /><line x1="220" y1="30" x2="220" y2="350" /></g>
    <path d={ring} fillRule="evenodd" className={`cin-r-gap ${cmp ? 'is-on' : ''}`} />
    <circle cx="220" cy="190" r="64" className={`cin-r-a ${showA ? 'is-on' : ''}`} />
    <circle cx="220" cy="190" r="80" className={`cin-r-b ${showB ? 'is-on' : ''}`} />
    <g className={`cin-r-dim ${showA ? 'is-on' : ''}`}>
      <line x1="156" y1="300" x2="284" y2="300" /><line x1="156" y1="292" x2="156" y2="308" /><line x1="284" y1="292" x2="284" y2="308" />
      <text x="220" y="288" textAnchor="middle">Ø 8 mm</text>
    </g>
    <g className={`cin-r-dim cin-r-dim-b ${showB ? 'is-on' : ''}`}>
      <line x1="140" y1="346" x2="300" y2="346" /><line x1="140" y1="338" x2="140" y2="354" /><line x1="300" y1="338" x2="300" y2="354" />
      <text x="220" y="372" textAnchor="middle">Ø 10 mm</text>
    </g>
    <g className={`cin-r-delta ${cmp ? 'is-on' : ''}`}>
      <line x1="284" y1="190" x2="350" y2="120" /><text x="356" y="116">Δ 2 mm</text>
    </g>
  </svg>
}

export function RadarSection() {
  const root = useRef<HTMLDivElement>(null)
  const inView = useInView(root, 0.4)
  const [view, setView] = useState<RadarView>('a')
  const played = useRef(false)

  useEffect(() => {
    if (!inView || played.current) return
    played.current = true
    if (prefersReducedMotion()) { setView('compare'); return }
    const t1 = window.setTimeout(() => setView('b'), 1100)
    const t2 = window.setTimeout(() => setView('compare'), 2300)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [inView])

  const pick = (v: RadarView) => { played.current = true; setView(v) }
  const cmp = view === 'compare'

  return <section className="cin-sec cin-sec-radar" id="radar" aria-labelledby="radar-h">
    <div className="cin-wrap">
      <Chapter n="04" name="Engineering Change Radar" />
      <Rv as="h2" className="cin-display cin-sec-h" delay={60}><span id="radar-h">Find the conflicts. Follow the evidence.</span></Rv>
      <Rv as="p" className="cin-lede" delay={100}>When sources disagree about the same thing, Footprint flags a potential conflict and points to both passages, so an engineer can decide.</Rv>

      <div ref={root} className="cin-radar" data-view={view}>
        <div className="cin-radar-visual">
          <RadarDiagram view={view} />
          <div className="cin-radar-tabs" role="group" aria-label="Show source">
            <button type="button" aria-pressed={view === 'a'} onClick={() => pick('a')}>Source A</button>
            <button type="button" aria-pressed={view === 'b'} onClick={() => pick('b')}>Source B</button>
            <button type="button" aria-pressed={cmp} onClick={() => pick('compare')}>Compare</button>
          </div>
        </div>
        <div className="cin-radar-side">
          <button type="button" className={`cin-src ${view === 'a' || cmp ? 'is-on' : ''}`} onClick={() => pick('a')} aria-label="Source A: Interface Drawing, 8 millimetres">
            <span className="cin-mono">Source A</span>
            <strong>Interface Drawing</strong>
            <span className="cin-src-value">8<small>mm</small></span>
            <span className="cin-src-quote">“Mounting bore diameter: 8 mm.”</span>
          </button>
          <button type="button" className={`cin-src cin-src-b ${view === 'b' || cmp ? 'is-on' : ''}`} onClick={() => pick('b')} aria-label="Source B: Assembly Specification, 10 millimetres">
            <span className="cin-mono">Source B</span>
            <strong>Assembly Specification</strong>
            <span className="cin-src-value">10<small>mm</small></span>
            <span className="cin-src-quote">“Mounting bore diameter: 10 mm.”</span>
          </button>
          <div className={`cin-verdict ${cmp ? 'is-on' : ''}`} role="status" aria-live="polite">
            {cmp
              ? <><p className="cin-verdict-title">Potential Conflict — Review Required</p>
                <p>The same interface dimension differs by 2 mm. Footprint doesn’t decide which source is right. It puts both passages in front of an engineer, who can mark the alert reviewed, resolved or dismissed.</p></>
              : <p className="cin-verdict-wait">Select Compare to see what Footprint flags.</p>}
          </div>
          <p className="cin-radar-why">Caught while drawings are still in review, this is a conversation. Caught at assembly, it is rework. <Link to="/how-it-works" className="cin-inline-link">How Change Radar works →</Link></p>
        </div>
      </div>
    </div>
  </section>
}

/* ============================ E. Security + conclusion ============================ */

const PANES = [
  { t: 'Workspace boundaries', b: 'Sources, claims and alerts stay inside their workspace, enforced by row-level security.' },
  { t: 'Private storage', b: 'Uploaded files are held privately and open only through short-lived links.' },
  { t: 'Server-side keys', b: 'AI credentials stay on the server and never reach the browser.' },
]

export function SecuritySection({ bridge }: { bridge?: string }) {
  return <section className="cin-sec cin-sec-security" id="security" aria-labelledby="sec-h">
    {bridge && <Bridge image={bridge} />}
    <div className="cin-wrap cin-sec-split">
      <div>
        <Chapter n="05" name="Security" />
        <Rv as="h2" className="cin-display cin-sec-h" delay={60}><span id="sec-h">Intelligence without compromise.</span></Rv>
        <Rv as="p" className="cin-lede" delay={120}>Design details and program decisions are sensitive. Footprint keeps them inside your workspace and is plain about what leaves it: to answer a question, the relevant source text and your question go to the AI provider.</Rv>
        <Rv as="p" className="cin-note" delay={160}>No certifications are claimed. <Link to="/security" className="cin-inline-link">Read the security page →</Link></Rv>
      </div>
      <div className="cin-panes">
        {PANES.map((p, i) => <Rv key={p.t} className={`cin-pane cin-glass cin-glow cin-pane-${i}`} delay={i * 110}>
          <h3>{p.t}</h3>
          <p>{p.b}</p>
        </Rv>)}
      </div>
    </div>
  </section>
}

export function ConclusionSection() {
  return <section className="cin-sec cin-conclusion" aria-labelledby="end-h">
    <img className="cin-conclusion-img" src={`${A}/hero.jpg`} alt="" loading="lazy" aria-hidden="true" />
    <div className="cin-wrap cin-conclusion-body">
      <Rv as="h2" className="cin-display cin-end-h"><span id="end-h">Context you can trust. Conflicts you can see.</span></Rv>
      <Rv as="p" className="cin-lede" delay={100}>Footprint brings fragmented engineering information together so teams can find context, recognize inconsistencies and make better-informed decisions.</Rv>
    </div>
    <footer className="cin-footer">
      <Link to="/" className="cin-brand"><span className="cin-slash" aria-hidden="true" />Footprint</Link>
      <nav aria-label="Footer navigation">{NAV.map(n => <Link key={n.to} to={n.to} className="cin-link">{n.label}</Link>)}</nav>
    </footer>
  </section>
}
