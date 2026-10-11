import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button, Icon } from '@/design-system/footprint-0a8b1a'
import { SiteLayout } from '@/components/site-layout'
import { pageHead } from '@/components/page-head'
import { Illustration } from '@/components/illustration'
import { FootprintStepTrail } from '@/components/showcase-motion'
import { ShowcaseSandbox } from '@/components/showcase-sandbox'
import { ConnectedSequence } from '@/components/ink-connectors'
import { FootprintWalk } from '@/components/footprint-walk'

export const Route = createFileRoute('/')({
  head: () => pageHead('Footprint — A home for shared knowledge', 'Bring your team’s sources together and turn scattered information into clearer answers with Footprint.'),
  component: Index,
})

function Index() {
  const navigate = useNavigate()
  return <SiteLayout>
    <main className="site-width">
      <section className="hero">
        <Illustration name="hero" eager />
        <p className="eyebrow"><Icon name="Sparkles" size="sm" /> A home for shared knowledge</p>
        <h1>Footprint.<br />Bring it all together.</h1>
        <p className="hero-copy">Your documents, links, and team knowledge. One considered place.<br />Less time looking for information. More room to think.</p>
        <div className="hero-actions"><Button size="lg" onClick={() => navigate({ to: '/app' })}>Open Footprint <Icon name="ArrowUpRight" /></Button><Link to="/how-it-works" className="site-link">See how it works <span aria-hidden="true">↗</span></Link></div>
      </section>

      <section id="product" aria-label="Footprint product demonstration">
        <ShowcaseSandbox />
      </section>

      <FootprintWalk />

      <section id="how-it-works" className="editorial-section">
        <p className="section-kicker">A simpler way to find your way</p>
        <h2 className="section-title">From scattered sources<br />to shared understanding.</h2>
        <ConnectedSequence className="steps">
          <article className="step"><FootprintStepTrail /><div className="step-number"><span>01 / Gather</span><Icon name="FilePlus2" /></div><Illustration name="gather" /><h3>Start with your sources.</h3><p>Bring documents and external links into one workspace. Keep the original close at hand.</p></article>
          <article className="step"><FootprintStepTrail /><div className="step-number"><span>02 / Organize</span><Icon name="Folder" /></div><Illustration name="organize" /><h3>Give knowledge a home.</h3><p>Group related information in collections, so the right context is always within reach.</p></article>
          <article className="step"><FootprintStepTrail /><div className="step-number"><span>03 / Ask</span><Icon name="Sparkles" /></div><Illustration name="ask" /><h3>Follow your curiosity.</h3><p>Ask a question, explore an answer, and trace it back to the sources that informed it.</p></article>
        </ConnectedSequence>
        <p className="preview-note">Live accounts, source uploads, and AI answers await connection to your existing project.</p>
      </section>

      <section className="closing"><Illustration name="insight" /><h2 className="section-title">Make room for what you know.</h2><p>A quieter place for your team’s collective thinking.</p><Button size="lg" onClick={() => navigate({ to: '/app' })}>Open Footprint <Icon name="ArrowUpRight" /></Button></section>
    </main>
  </SiteLayout>
}
