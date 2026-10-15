import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { CyclingCards, Rv, type CycleItem } from '@/ui/marketing/interactive'

const A = '/landing'

/** Continues the last frame of the preceding video into the section, then fades to the page background. */
function Bridge({ image, side = 'full' }: { image: string; side?: 'full' | 'left' }) {
  return <div className={`cin-bridge cin-bridge-${side}`} aria-hidden="true"><img src={`${A}/${image}`} alt="" loading="lazy" /></div>
}

function Heading({ kicker, children }: { kicker: string; children: ReactNode }) {
  return <>
    <Rv as="p" className="cin-mono cin-kicker">{kicker}</Rv>
    <Rv as="h2" className="cin-display cin-sec-h" delay={60}>{children}</Rv>
  </>
}

/* ----------------------------- Problem ----------------------------- */

const PROBLEM_SOURCES = ['Design documentation', 'Requirements', 'Test reports', 'Manufacturing information', 'Project decisions', 'Team communication']
const PROBLEMS = [
  { n: '01', title: 'Information is hard to find.', body: 'The answer exists, but it sits in a drawing revision, a test report or a meeting note nobody remembers. Engineers spend time searching instead of deciding.' },
  { n: '02', title: 'Teams work from different assumptions.', body: 'Mechanical, electrical and test teams each keep their own version of an interface or a constraint, and nothing prompts anyone to compare them.' },
  { n: '03', title: 'Important changes are found too late.', body: 'A changed dimension or requirement can slip through until integration, when fixing it is slow and expensive.' },
]

export function ProblemSection({ bridge }: { bridge?: string }) {
  return <section className="cin-sec cin-sec-problem" id="problem" aria-labelledby="problem-h">
    {bridge && <Bridge image={bridge} />}
    <div className="cin-wrap">
      <Heading kicker="The problem"><span id="problem-h">Engineering knowledge is everywhere. Context is nowhere.</span></Heading>
      <div className="cin-two">
        <div className="cin-copy">
          <Rv as="p" className="cin-lede">On a hardware program, the facts that matter are spread across design documentation, requirements, test reports, manufacturing information, project decisions and team conversations. Each source can be right on its own while the picture as a whole drifts out of sync.</Rv>
          <Rv as="p" className="cin-body" delay={80}>The cost shows up later as missed decisions, inconsistent assumptions, rework and delays.</Rv>
        </div>
        <Rv as="ul" className="cin-tags cin-tags-lg" aria-label="Where engineering information lives" delay={120}>
          {PROBLEM_SOURCES.map(s => <li key={s}>{s}</li>)}
        </Rv>
      </div>
      <div className="cin-cards-3">
        {PROBLEMS.map((p, i) => <Rv as="article" key={p.n} className="cin-card cin-glow" delay={i * 90}>
          <p className="cin-mono cin-kicker">{p.n}</p>
          <h3 className="cin-card-h">{p.title}</h3>
          <p className="cin-body">{p.body}</p>
        </Rv>)}
      </div>
    </div>
  </section>
}

/* ----------------------------- Ingestion ----------------------------- */

const METHODS = [
  { tag: 'File uploads', body: 'PDF, Markdown and plain-text files up to 20 MB. Text and Markdown are read for analysis today; PDFs are stored and queued for indexing.' },
  { tag: 'External links', body: 'Save a web link alongside your files as a reference your team can find again.' },
  { tag: 'Workspaces', body: 'Separate workspaces and sub-workspaces keep programs, teams and subsystems apart.' },
  { tag: 'Collections', body: 'Group related sources inside a workspace so the context stays together.' },
]
const SOURCE_CARDS = [
  { tag: 'Drawings', name: 'Interface drawing' },
  { tag: 'Reports', name: 'Thermal test report' },
  { tag: 'Requirements', name: 'System requirements' },
  { tag: 'Test data', name: 'Vibration test log' },
]

export function IngestionSection() {
  return <section className="cin-sec cin-sec-ingest" id="ingestion" aria-labelledby="ingest-h">
    <div className="cin-wrap">
      <Heading kicker="Bring information together"><span id="ingest-h">Start with the documents you already have.</span></Heading>
      <div className="cin-two cin-two-top">
        <div className="cin-copy">
          <Rv as="p" className="cin-lede">Footprint doesn’t ask you to replace your tools or re-enter your data. Add the files and links you already work from and organize them by program. Every source stays tied to its original, so you can always check where an answer came from.</Rv>
          <ul className="cin-methods">
            {METHODS.map((m, i) => <Rv as="li" key={m.tag} delay={i * 70}>
              <span className="cin-mono cin-kicker">{m.tag}</span>
              <span className="cin-body">{m.body}</span>
            </Rv>)}
          </ul>
        </div>
        <Rv className="cin-ingest-visual" aria-hidden="true" delay={100}>
          <div className="cin-ingest-cards">
            {SOURCE_CARDS.map((c, i) => <div key={c.tag} className="cin-source-card cin-glow" style={{ '--i': i } as React.CSSProperties}>
              <span className="cin-mono">{c.tag}</span><strong>{c.name}</strong>
              <i className="cin-lines" />
            </div>)}
          </div>
          <svg className="cin-ingest-flow" viewBox="0 0 100 400" preserveAspectRatio="none">
            {[50, 150, 250, 350].map((y, i) => <path key={y} d={`M0 ${y} C 55 ${y}, 45 200, 100 200`} className="cin-flow-path" style={{ animationDelay: `${-i * 0.7}s` }} />)}
          </svg>
          <div className="cin-workspace cin-glow">
            <span className="cin-mono cin-kicker">Workspace</span>
            <strong>One place for every source</strong>
            <ul><li>Sources</li><li>Collections</li><li>Claims & evidence</li></ul>
          </div>
        </Rv>
      </div>
      <Rv as="p" className="cin-note" delay={60}>Illustrative examples. Direct integrations with CAD, PLM and issue-tracking tools are a future direction and are not available today.</Rv>
    </div>
  </section>
}

/* ----------------------------- Intelligence ----------------------------- */

const QUESTIONS: CycleItem[] = [
  { id: 'q1', label: 'What could constrain this decision?', tag: 'Example question', title: 'What existing work could constrain this decision?', sources: ['Requirements', 'Past decisions', 'Test reports'], body: 'Constraints and earlier decisions that touch the topic, each cited to the source it came from.' },
  { id: 'q2', label: 'Do our sources conflict?', tag: 'Example question', title: 'Are there conflicts between the current sources?', sources: ['Drawings', 'Specifications'], body: 'Places where sources disagree, with the passages from both sides cited together.' },
  { id: 'q3', label: 'What still needs validating?', tag: 'Example question', title: 'What assumptions in this plan still need validation?', sources: ['Plans', 'Requirements', 'Test data'], body: 'Assumptions that have no supporting evidence in the workspace yet.' },
  { id: 'q4', label: 'What does this change affect?', tag: 'Example question', title: 'Which systems could be affected by this change?', sources: ['Interface documents', 'Architecture notes'], body: 'Systems named in related interfaces and requirements, linked back to their sources.' },
]
const CAPABILITIES = [
  { t: 'Plain-language questions', b: 'Ask the way you would ask a colleague, across every source in a workspace.' },
  { t: 'Answers from your sources', b: 'Responses are written from the material you added, not from the open web.' },
  { t: 'Citations on every answer', b: 'Each answer names the sources it used so you can follow it back.' },
  { t: 'Inspect the evidence', b: 'Open the cited source, the quoted passage and the claims extracted from it.' },
]

export function IntelligenceSection({ bridge }: { bridge?: string }) {
  return <section className="cin-sec cin-sec-intel" id="intelligence" aria-labelledby="intel-h">
    {bridge && <Bridge image={bridge} side="left" />}
    <div className="cin-wrap">
      <Heading kicker="Find answers"><span id="intel-h">Find the answers hidden in your engineering data.</span></Heading>
      <div className="cin-two cin-two-top">
        <div className="cin-copy">
          <Rv as="p" className="cin-lede">Ask a question and Footprint searches the sources in your workspace, writes an answer from that material only, and attaches the sources it used. When the evidence is thin or contradictory, it says so instead of guessing.</Rv>
          <ul className="cin-caps">
            {CAPABILITIES.map((c, i) => <Rv as="li" key={c.t} delay={i * 70}><strong>{c.t}</strong><span className="cin-body">{c.b}</span></Rv>)}
          </ul>
        </div>
        <Rv delay={100}>
          <CyclingCards items={QUESTIONS} label="Example questions Footprint can answer" />
          <p className="cin-note">Examples of the kinds of questions you can ask. The full product interface opens when you launch Footprint.</p>
        </Rv>
      </div>
    </div>
  </section>
}

/* ----------------------------- Change Radar ----------------------------- */

const RADAR_STEPS = [
  { n: '01', t: 'Extract', b: 'When a source is analyzed, Footprint pulls out the engineering claims it makes (interfaces, requirements, constraints, decisions, assumptions) with the exact passage as evidence.' },
  { n: '02', t: 'Compare', b: 'New claims are compared with claims from your other sources in the same workspace.' },
  { n: '03', t: 'Flag', b: 'Where values look incompatible, Footprint raises a possible conflict with a severity and links both passages.' },
  { n: '04', t: 'Review', b: 'An engineer reads the evidence and marks the alert reviewed, resolved or dismissed.' },
]
const ALERT_TYPES = ['Possible conflict', 'Changed constraint', 'Interface mismatch', 'Unsupported assumption']

export function RadarSection() {
  return <section className="cin-sec cin-sec-radar" id="radar" aria-labelledby="radar-h">
    <div className="cin-wrap">
      <Heading kicker="Engineering Change Radar"><span id="radar-h">Find the conflicts. Follow the evidence.</span></Heading>
      <Rv as="p" className="cin-lede cin-lede-wide" delay={80}>Teams can build on different dimensions, requirements or assumptions without anyone noticing. Change Radar watches for this as sources are added, and points engineers to the passages that disagree, so a possible problem becomes a conversation while it is still cheap to fix.</Rv>

      <Rv className="cin-demo" delay={60}>
        <p className="cin-mono cin-demo-label">Example · Mechanical interface</p>
        <div className="cin-demo-grid">
          <article className="cin-evidence cin-glow" aria-label="Source A: Interface Drawing, 8 millimetres">
            <p className="cin-mono cin-kicker">Source A</p>
            <h3 className="cin-evidence-name">Interface Drawing</h3>
            <p className="cin-evidence-field cin-mono">Mounting bore diameter</p>
            <p className="cin-evidence-value">8<span>mm</span></p>
            <p className="cin-evidence-quote">“Mounting bore diameter: 8 mm.”</p>
          </article>
          <div className="cin-connector" aria-hidden="true">
            <svg viewBox="0 0 200 40" preserveAspectRatio="none"><path d="M0 20 H200" className="cin-conn-line" /></svg>
            <span className="cin-conn-node cin-mono">≠</span>
          </div>
          <article className="cin-evidence cin-evidence-b cin-glow" aria-label="Source B: Assembly Specification, 10 millimetres">
            <p className="cin-mono cin-kicker">Source B</p>
            <h3 className="cin-evidence-name">Assembly Specification</h3>
            <p className="cin-evidence-field cin-mono">Mounting bore diameter</p>
            <p className="cin-evidence-value">10<span>mm</span></p>
            <p className="cin-evidence-quote">“Mounting bore diameter: 10 mm.”</p>
          </article>
        </div>
        <div className="cin-conflict" role="status">
          <span className="cin-conflict-dot" aria-hidden="true" />
          <div>
            <p className="cin-mono cin-conflict-title">Potential Conflict — Review Required</p>
            <p className="cin-body">The same interface dimension differs by 2 mm between two sources. Footprint doesn’t decide which one is correct. It shows both passages so an engineer can.</p>
          </div>
        </div>
      </Rv>

      <div className="cin-two cin-two-top cin-radar-lower">
        <ol className="cin-steps">
          {RADAR_STEPS.map((s, i) => <Rv as="li" key={s.n} delay={i * 70}>
            <span className="cin-mono cin-kicker">{s.n}</span>
            <div><strong>{s.t}</strong><span className="cin-body">{s.b}</span></div>
          </Rv>)}
        </ol>
        <Rv className="cin-why cin-glow" delay={100}>
          <h3 className="cin-card-h">Why early detection matters</h3>
          <p className="cin-body">A mismatch found while drawings are still being reviewed is a quick conversation. Found at assembly, it is rework. Radar is built to surface it while it is still a question.</p>
          <p className="cin-mono cin-demo-label">Alert types</p>
          <ul className="cin-tags">{ALERT_TYPES.map(t => <li key={t}>{t}</li>)}</ul>
          <p className="cin-note">Alerts are suggestions for human review. Nothing is changed or approved automatically.</p>
        </Rv>
      </div>
    </div>
  </section>
}

/* ----------------------------- Security ----------------------------- */

const SECURITY = [
  { t: 'Workspace boundaries', b: 'Sources, claims and alerts belong to a workspace, and database row-level security limits access to its members.' },
  { t: 'Private file storage', b: 'Uploaded files are kept in private storage. Originals open only through short-lived signed links.' },
  { t: 'Server-side AI credentials', b: 'AI provider keys stay on the server and are never sent to the browser.' },
  { t: 'Plain AI data handling', b: 'To answer a question or analyze a source, the relevant source text and your question are sent to the AI provider (Google Gemini). Footprint does not run the model locally.' },
]

export function SecuritySection({ bridge }: { bridge?: string }) {
  return <section className="cin-sec cin-sec-security" id="security" aria-labelledby="sec-h">
    {bridge && <Bridge image={bridge} />}
    <div className="cin-wrap">
      <Heading kicker="Security & data handling"><span id="sec-h">Intelligence without compromise.</span></Heading>
      <Rv as="p" className="cin-lede cin-lede-wide" delay={80}>Design details and program decisions are sensitive. Here is what Footprint does today, stated plainly.</Rv>
      <div className="cin-cards-2">
        {SECURITY.map((s, i) => <Rv as="article" key={s.t} className="cin-card cin-glow" delay={i * 80}>
          <h3 className="cin-card-h">{s.t}</h3>
          <p className="cin-body">{s.b}</p>
        </Rv>)}
      </div>
      <Rv as="p" className="cin-note cin-note-lg" delay={60}>
        Footprint does not claim SOC 2 or other certifications, and it is not an air-gapped or on-premises product.{' '}
        <Link to="/security" className="cin-inline-link">Read the full security page →</Link>
      </Rv>
    </div>
  </section>
}

/* ----------------------------- Conclusion + footer ----------------------------- */

export const NAV = [
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/collections', label: 'Collections' },
  { to: '/security', label: 'Security' },
  { to: '/pricing', label: 'Pricing' },
] as const

export function ConclusionSection() {
  return <section className="cin-sec cin-conclusion" aria-labelledby="end-h">
    <img className="cin-conclusion-img" src={`${A}/hero.jpg`} alt="" loading="lazy" aria-hidden="true" />
    <div className="cin-wrap cin-conclusion-body">
      <Rv as="p" className="cin-mono cin-kicker">Engineering intelligence</Rv>
      <Rv as="h2" className="cin-display cin-sec-h" delay={60}><span id="end-h">Context you can trust. Conflicts you can see.</span></Rv>
      <Rv as="p" className="cin-lede cin-lede-wide" delay={120}>Footprint brings fragmented engineering information together so teams can find context, recognize inconsistencies and make better-informed decisions.</Rv>
    </div>
    <footer className="cin-footer">
      <Link to="/" className="cin-brand"><span className="cin-slash" aria-hidden="true" />Footprint</Link>
      <nav aria-label="Footer navigation">{NAV.map(n => <Link key={n.to} to={n.to} className="cin-link">{n.label}</Link>)}</nav>
    </footer>
  </section>
}
