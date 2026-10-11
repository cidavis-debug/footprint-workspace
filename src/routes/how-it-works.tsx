import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon } from '@/design-system/footprint-0a8b1a'
import { SiteLayout } from '@/components/site-layout'
import { PageIntroduction, PageInvitation } from '@/components/content-page'
import { pageHead } from '@/components/page-head'
import { Illustration } from '@/components/illustration'

export const Route = createFileRoute('/how-it-works')({
  head: () => pageHead('How it works — Footprint', 'Discover the Footprint workflow: gather documents and links, organize collections, and ask source-grounded questions.'),
  component: HowItWorks,
})

function HowItWorks() {
  return <SiteLayout><main className="site-width">
    <PageIntroduction kicker="How it works" title="A question. A source. A clearer answer." description="Footprint is designed to bring scattered information into a shared workspace. Here’s the path from a pile of documents to a useful conversation." />
    <p className="availability-note"><Icon name="Link2" /> Product preview · The workflow below describes intended capabilities, not a connected service.</p>
    <section className="flow" aria-label="The Footprint workflow">
      <article className="surface-raised panel flow-gather-wrap reveal"><div className="flow-head"><span className="big-number">01</span></div><div className="flow-gather"><div><p className="section-kicker">Gather</p><h2>Start with what you already know.</h2><p>Upload project briefs, meeting notes, or research. Save an external link with a title and, when you want it included in answers, paste the relevant text yourself.</p><ul className="source-examples mt-5"><li><Icon name="FileText" /><span>Launch brief.pdf</span></li><li><Icon name="FileText" /><span>Customer interviews.docx</span></li><li><Icon name="FileText" /><span>Research notes.txt</span></li></ul><p className="demo-label">Example sources · PDF, DOCX, and TXT · Up to 10 MB per file</p></div><Illustration name="gather" size="wide" /></div></article>
      <article className="panel reveal"><div className="flow-head"><span className="big-number">02</span></div><p className="section-kicker">Organize</p><h2>Keep the right things together.</h2><p>A workspace gives your team a shared home. Collections group sources by project, topic, or purpose.</p><div className="surface-inset mini-preview"><Icon name="Folder" /><h3>Product launch</h3><p>Briefs · Research · Team notes</p><span className="demo-label">Illustrative collection</span></div><Link to="/collections" className="site-link">Find a collection that fits ↗</Link></article>
      <article className="surface-raised panel flow-ask reveal"><div className="flow-head"><span className="big-number">03</span></div><div className="flow-ask-body"><div><p className="section-kicker">Ask</p><h2>Let your questions lead.</h2><p>Ask about information in the selected workspace. Answers are intended to use the available source text and cite the documents behind them, so you can check the original context.</p><p className="detail-note">No source can guarantee a perfect answer. Check important details against the original.</p></div><div className="mini-preview"><div className="question">“What’s still open before launch?”</div><p>Two decisions remain open: final pricing copy and the support handoff date.</p><p className="flex items-center gap-2 text-sm"><Icon name="FileText" /> Launch brief.pdf · Team decisions.docx</p><span className="demo-label">Example prompt and answer · Not a live response</span></div></div></article>
    </section>
    <section className="reading-band"><h2 className="section-title">Links stay honest.</h2><div><p>A saved URL is a reference, not an automatically imported document. Footprint does not silently read private Google Drive or OneDrive content. Paste the text you want to use, or upload a supported file.</p><Link to="/security" className="site-link">Read the data boundaries ↗</Link></div></section>
    <PageInvitation />
  </main></SiteLayout>
}