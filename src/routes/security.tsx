import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon } from '@/design-system/footprint-0a8b1a'
import { SiteLayout } from '@/components/site-layout'
import { PageIntroduction, PageInvitation } from '@/components/content-page'
import { pageHead } from '@/components/page-head'
import { Illustration } from '@/components/illustration'

export const Route = createFileRoute('/security')({
  head: () => pageHead('Security & data boundaries — Footprint', 'Understand Footprint’s intended workspace access, private document storage, AI data handling, and current setup status.'),
  component: Security,
})

function Security() {
  return <SiteLayout><main className="site-width">
    <PageIntroduction kicker="Security & data boundaries" title="Your knowledge deserves clear boundaries." description="Trust starts with being specific about what a product does—and what it doesn’t. Here is the intended approach to access, source content, and AI in Footprint." />
    <section className="surface-raised status-panel"><Illustration name="verified" /><div><h2>Not connected. Not collecting.</h2><p>Account access, private uploads, and AI requests are unavailable in this preview. No upload or question is currently saved or sent to an AI service by the workspace.</p></div></section>
    <section className="bento" aria-label="Intended security approach">
      <article className="surface-emphasis panel tile-main reveal"><Icon name="Search" /><span className="step-number">01 / Access</span><h2>Membership is the boundary.</h2><p>The intended model restricts documents and AI searches to members of the selected workspace. Collections organize sources within that boundary; they do not add a second layer of permissions.</p></article>
      <article className="surface-tint panel reveal"><span className="step-number">02 / Storage</span><h2>Private by design.</h2><p>Uploaded documents are intended for private storage, not public download links. Access controls must be connected and verified before private team information is added.</p></article>
      <article className="surface-tint panel reveal"><span className="step-number">03 / AI requests</span><h2>Only the relevant context.</h2><p>The planned assistant uses Gemini Flash with bounded source context. Selected document text and your question would be sent to the AI provider. This is not local-only processing.</p></article>
      <article className="surface-raised panel tile-wide"><Icon name="Check" /><div><span className="step-number">04 / Credentials</span><h2>Keys stay out of the browser.</h2><p>AI credentials are intended to stay on the server. The browser should never receive a private API key. Live credential handling and access checks still need to be configured and tested.</p></div></article>
    </section>
    <section className="reading-band"><div><h2 className="section-title">No invisible access.<br />No inflated claims.</h2></div><div><p>Saving a Google Drive or OneDrive URL does not grant Footprint access to its private contents. Links without pasted text remain reference-only.</p><p>This preview does not claim SOC 2 certification, HIPAA compliance, end-to-end encryption, or a verified retention policy. Those assurances require separate implementation and review.</p><Link to="/how-it-works" className="site-link">See how sources are intended to work ↗</Link></div></section>
    <PageInvitation />
  </main></SiteLayout>
}