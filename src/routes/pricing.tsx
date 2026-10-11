import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Icon } from '@/design-system/footprint-0a8b1a'
import { SiteLayout } from '@/components/site-layout'
import { pageHead } from '@/components/page-head'
import { PageIntroduction, PageInvitation } from '@/components/content-page'
import { NavigationButton } from '@/components/navigation-button'

export const Route = createFileRoute('/pricing')({ head: () => pageHead('Pricing — Footprint', 'Explore proposed Free, Pro, and Team pricing for Footprint, with transparent limits and monthly or annual options.'), component: Pricing })

const plans = [
  { name: 'Free', description: 'A small home for a fresh idea.', monthly: 0, annual: 0, features: ['1 workspace · 1 member', '25 sources', '50 AI questions per month', 'Collections and source citations'] },
  { name: 'Pro', description: 'More room for your everyday thinking.', monthly: 12, annual: 9, features: ['3 workspaces · 1 member', '500 sources across workspaces', '500 AI questions per month', 'Collections and source citations'] },
  { name: 'Team', description: 'A common home for collective knowledge.', monthly: 29, annual: 24, features: ['10 workspaces · 5 members included', '2,000 sources across workspaces', '2,000 shared AI questions per month', 'Workspace membership and shared collections'] },
]

function Pricing() {
  const [annual, setAnnual] = useState(false)
  return <SiteLayout><main className="site-width">
    <PageIntroduction illustration="team" kicker="Footprint pricing" title="Good knowledge. A considered plan." description="Start with a few sources, find your rhythm, and make room for your team. A proposed plan for each stage of your shared knowledge." />
    <p className="availability-note"><Icon name="FileText" /> Draft pricing · USD · Illustrative plans, not a live offer. Subscriptions and payments are unavailable.</p>
    <div className="billing-row"><div className="segmented surface-inset" role="group" aria-label="Billing period"><Button variant={annual ? 'quiet' : 'primary'} aria-pressed={!annual} onClick={() => setAnnual(false)}>Monthly</Button><Button variant={annual ? 'primary' : 'quiet'} aria-pressed={annual} onClick={() => setAnnual(true)}>Yearly</Button></div><span className="demo-label">Lower monthly equivalent with yearly billing</span></div>
    <section className="pricing-plans" aria-label="Proposed plans">{plans.map(plan => <article className={`plan reveal plan-${plan.name.toLowerCase()}${plan.name === 'Pro' ? ' plan-featured' : ''}`} key={plan.name}><div className="plan-heading"><h2>{plan.name}</h2>{plan.name === 'Pro' && <span className="section-kicker">For everyday use</span>}</div><p>{plan.description}</p><p className="plan-price">${annual ? plan.annual : plan.monthly}<span> / month</span></p><p className="detail-note">{plan.monthly === 0 ? 'Proposed free plan' : annual ? `$${plan.annual * 12} billed yearly per ${plan.name === 'Team' ? 'team' : 'account'}` : `Billed monthly per ${plan.name === 'Team' ? 'team' : 'account'}`}</p><ul className="plan-features">{plan.features.map(feature => <li key={feature}><Icon name="Check" size="sm" /><span>{feature}</span></li>)}</ul><NavigationButton variant={plan.name === 'Pro' ? 'primary' : 'secondary'} to="/app">Explore workspace <Icon name="ArrowUpRight" /></NavigationButton><p className="demo-label plan-note">Preview only · No checkout</p></article>)}</section>
    <section className="reading-band"><h2 className="section-title">A few useful details.</h2><div className="pricing-faq">
      <details><summary>Can I subscribe now?</summary><p>Not yet. These prices and limits are draft examples. The workspace is a disconnected preview, and no plan can be purchased or activated.</p></details>
      <details><summary>What counts as a source?</summary><p>A supported uploaded document or a saved external link. PDF, DOCX, and TXT files are intended to support up to 10 MB each. A link without pasted content is reference-only and is not automatically read by the AI.</p></details>
      <details><summary>How does Team pricing work?</summary><p>The proposed Team price covers five members, rather than charging per person. Source and question limits would be shared across the team’s workspaces. Additional member pricing has not been defined.</p></details>
      <details><summary>Are taxes and overages included?</summary><p>Tax treatment has not been finalized. There are no automatic overage charges in this proposed model; usage limits and any future upgrade options need to be confirmed before launch.</p></details>
      <Link to="/security" className="site-link">Understand the data boundaries ↗</Link>
    </div></section>
    <PageInvitation />
  </main></SiteLayout>
}