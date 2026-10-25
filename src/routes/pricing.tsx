import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowUpRight, Check } from 'lucide-react'
import { pageHead } from '@/components/page-head'
import { MarketingPage, Rail, Reveal, SplitHeading, Stage } from '@/components/landing/shared'

export const Route = createFileRoute('/pricing')({
  head: () => pageHead('Pricing — Footprint AI', 'Draft Free, Pro, and Team plans for Footprint AI, clearly labeled as proposals.'),
  component: Pricing,
})

/** Draft plan data carried over from the previous page. Proposed only — not a live offer. */
const plans = [
  { name: 'Free', blurb: 'Try it on a single program.', monthly: 0, annual: 0 },
  { name: 'Pro', blurb: 'For an engineer’s everyday sources.', monthly: 12, annual: 9 },
  { name: 'Team', blurb: 'For teams; shared workspaces planned.', monthly: 29, annual: 24 },
] as const

const rows: { label: string; vals: [string, string, string]; note?: string }[] = [
  { label: 'Workspaces', vals: ['1', '3', '10'] },
  { label: 'Members', vals: ['1', '1', '5 included'], note: 'Multi-member workspaces are not available in the product today.' },
  { label: 'Sources', vals: ['25', '500 across workspaces', '2,000 across workspaces'] },
  { label: 'AI questions per month', vals: ['50', '500', '2,000 shared'] },
  { label: 'Collections and source citations', vals: ['Included', 'Included', 'Included'] },
  { label: 'Shared collections', vals: ['—', '—', 'Proposed'], note: 'Proposed for Team; not available today.' },
]

const faq = [
  { q: 'Can I subscribe now?', a: 'No. These prices and limits are draft proposals. No plan can be purchased or activated.' },
  { q: 'What counts as a source?', a: 'An uploaded file (PDF, Word, Excel, PowerPoint, Markdown or text, up to 20 MB each) or a saved public web link whose page text Footprint AI reads.' },
  { q: 'How would Team pricing work?', a: 'The proposed Team price would include five members rather than charging per person, with source and question limits shared across the team’s workspaces. Extra-member pricing has not been defined, and multi-member workspaces do not exist yet.' },
  { q: 'Are taxes and overages included?', a: 'Tax treatment has not been decided. The proposal has no automatic overage charges; limits and any upgrade options would be confirmed before launch.' },
]

function Pricing() {
  const [annual, setAnnual] = useState(false)
  const [sel, setSel] = useState(1)
  const p = plans[sel]!
  const price = (i: number) => annual ? plans[i]!.annual : plans[i]!.monthly
  return <MarketingPage lean="l">
    <section className="lp-pagehero lp-price-hero">
      <div className="lp-inner">
      <div className="arc-plate arc-f-steel arc-inset lp-price-slab">
      <Rail className="arc-rail-wide" />
      <div className="lp-price-hero-inner">
        <div>
          <p className="lp-mono lp-eyebrow">Footprint AI pricing · draft</p>
          <SplitHeading className="lp-mega" lines={[{ t: 'Good knowledge.' }, { t: 'A considered plan.', accent: true }]} />
        </div>
        <Reveal dir="none" delay={400} className="lp-lit lp-price-note lp-glass-light">
          <b>Draft pricing · USD</b>
          <p>These plans are proposals, not a live offer. Subscriptions and payments are unavailable.</p>
        </Reveal>
      </div>
      </div>
      </div>
    </section>

    <section className="lp-price-compare" aria-labelledby="lp-plans-h">
      <div className="lp-inner">
        <div className="lp-price-controls">
          <h2 id="lp-plans-h" className="lp-h2 lp-h2-sm">Compare the proposed plans</h2>
          <div className="lp-seg" role="group" aria-label="Billing period">
            <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>Monthly</button>
            <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>Yearly</button>
          </div>
        </div>
        <Reveal dir="slide-u" className="lp-lit lp-glass-light lp-table-wrap">
          <table className="lp-table">
            <caption className="lp-sr">Proposed plans compared. Select a plan heading for details.</caption>
            <thead>
              <tr><td />
                {plans.map((pl, i) => <th key={pl.name} scope="col" data-sel={sel === i}>
                  <button type="button" aria-pressed={sel === i} onClick={() => setSel(i)}>
                    <span className="lp-plan-name">{pl.name}</span>
                    <span className="lp-plan-price">${price(i)}<small> / month</small></span>
                  </button>
                </th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => <tr key={r.label}>
                <th scope="row">{r.label}{r.note && <small>{r.note}</small>}</th>
                {r.vals.map((val, i) => <td key={i} data-sel={sel === i}>{val === 'Included' ? <Check size={16} aria-label="Included" /> : val}</td>)}
              </tr>)}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>

    <Stage className="lp-section lp-dark lp-slate lp-price-spot arc-sec arc-wt arc-wb arc-t-l arc-b-r arc-tib" aria-live="polite" aria-label="Selected plan">
      <div className="lp-dark-bg" aria-hidden="true" />
      <i className="arc-tiband" aria-hidden="true" />
      <div className="lp-inner lp-spot-grid">
        <div key={p.name} className="lp-spot-copy">
          <p className="lp-mono lp-eyebrow">Selected plan</p>
          <h2 className="lp-h2">{p.name}<span>{p.blurb}</span></h2>
        </div>
        <div className="lp-lit lp-glass lp-spot-panel" key={`${p.name}-${annual}`}>
          <p className="lp-spot-price">${price(sel)}<small> / month</small></p>
          <p className="lp-mono lp-spot-sub">{p.monthly === 0 ? 'Proposed free plan' : annual ? `$${p.annual * 12} billed yearly per ${p.name === 'Team' ? 'team' : 'account'}` : `Billed monthly per ${p.name === 'Team' ? 'team' : 'account'}`}</p>
          <ul>
            {rows.slice(0, 4).map(r => <li key={r.label}><span>{r.label}</span><b>{r.vals[sel]}</b></li>)}
          </ul>
          <Link to="/app" className="lp-btn lp-btn-primary">Explore the workspace <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <p className="lp-fine">Draft proposal only. Exploring the workspace does not start a subscription.</p>
        </div>
      </div>
    </Stage>

    <section className="lp-section lp-price-faq" aria-labelledby="lp-faq-h">
      <div className="lp-inner lp-faq-grid">
        <Reveal dir="slide-l" className="arc-plate arc-f-steel arc-inset arc-bleed-l"><p className="lp-mono lp-eyebrow">Useful details</p><h2 id="lp-faq-h" className="lp-h2">Before you <span>ask.</span></h2></Reveal>
        <div className="lp-faq">
          {faq.map((f, i) => <Reveal key={f.q} dir={i % 2 ? 'none' : 'fade'} delay={i * 70}><details className="lp-details"><summary>{f.q}</summary><p>{f.a}</p></details></Reveal>)}
          <Link to="/security" className="lp-textlink lp-textlink-ink">Understand the data boundaries <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  </MarketingPage>
}
