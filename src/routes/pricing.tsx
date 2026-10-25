import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowUpRight, Check } from 'lucide-react'
import { pageHead } from '@/components/page-head'
import { MarketingPage, Rail, Reveal, SplitHeading, Stage } from '@/components/landing/shared'

export const Route = createFileRoute('/pricing')({
  head: () => pageHead('Pricing — Footprint AI', 'Draft Team, Growth, and Organization plans for Footprint AI, priced by contributors and labeled as proposals.'),
  component: Pricing,
})

/** Draft plan data carried over from the previous page. Proposed only — not a live offer. */
const plans = [
  { name: 'Team', blurb: 'For a team on one program.', monthly: 1, annual: 12 },
  { name: 'Growth', blurb: 'For teams across more programs.', monthly: 2, annual: 24 },
  { name: 'Organization', blurb: 'Advanced admin for the whole company.', monthly: 4, annual: 48 },
] as const

const rows: { label: string; vals: [string, string, string]; note?: string }[] = [
  { label: 'Shared team workspaces', vals: ['Included', 'Included', 'Included'] },
  { label: 'Contributors', vals: ['~20', '~30', '~60'] },
  { label: 'Superfolders and auto-sync', vals: ['Included', 'Included', 'Included'] },
  { label: 'Cited answers', vals: ['Included', 'Included', 'Included'] },
  { label: 'Engineering Change Radar', vals: ['Included', 'Included', 'Included'] },
  { label: 'Slack and Teams routing', vals: ['Included', 'Included', 'Included'] },
]

const faq = [
  { q: 'Are these final prices?', a: 'These tiers are draft proposals, to be tested in pilots with hardware teams.' },
  { q: 'What counts as a source?', a: 'A file, page, ticket, thread or record from a connected tool such as Drive, SharePoint, Jira, Confluence, Slack or your PLM.' },
  { q: 'How would Team pricing work?', a: 'Plans are priced by contributors rather than per seat: about 20 on Team, 30 on Growth and 60 on Organization, with shared team workspaces and superfolders included.' },
  { q: 'Who is Footprint AI built for?', a: 'Hardware engineering teams, starting with mid-size robotics and hardware companies, then drones, EV batteries, medical devices and industrial automation. Aerospace and defense are the long-term goal through on-prem and ITAR-compliant deployment.' },
]

function Pricing() {
  const [annual, setAnnual] = useState(true)
  const [sel, setSel] = useState(1)
  const p = plans[sel]!
  const price = (i: number) => `$${annual ? plans[i]!.annual : plans[i]!.monthly}K`
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
          <b>Draft pricing · USD, per team</b>
          <p>These plans are draft proposals, priced by contributors and to be tested in pilots.</p>
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
                    <span className="lp-plan-price">{price(i)}<small>{annual ? ' / year' : ' / month'}</small></span>
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
          <p className="lp-spot-price">{price(sel)}<small>{annual ? ' / year' : ' / month'}</small></p>
          <p className="lp-mono lp-spot-sub">{annual ? 'One subscription per team, billed yearly' : `$${p.annual}K per year, billed yearly per team`}</p>
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
