import { createFileRoute, Link } from '@tanstack/react-router'
import { FileText, Folder, Link2 } from 'lucide-react'
import { SiteLayout } from '@/components/site-layout'
import { PageIntroduction, PageInvitation } from '@/components/content-page'
import { pageHead } from '@/components/page-head'
import { Illustration } from '@/components/illustration'
import { ConnectedSequence } from '@/components/ink-connectors'

export const Route = createFileRoute('/collections')({
  head: () => pageHead('Collections — Footprint', 'Explore ways to organize project briefs, team notes, and research into shared Footprint collections.'),
  component: Collections,
})

const examples = [
  { number: '01', title: 'A project in motion.', name: 'Product launch', description: 'Give every brief, decision, and handoff a common home. Keep the context close as the project changes.', files: ['Launch brief.pdf', 'Team decisions.docx', 'Handoff notes.txt'], question: 'What decisions are still outstanding?' },
  { number: '02', title: 'Research worth returning to.', name: 'Customer research', description: 'Bring interviews and findings together, so a useful insight doesn’t disappear into an old folder.', files: ['Interview synthesis.docx', 'Survey findings.pdf', 'Research links + pasted excerpts'], question: 'Which concerns came up most often?' },
  { number: '03', title: 'A smoother first week.', name: 'Team onboarding', description: 'Gather the documents that help someone find their feet: how the team works, what matters, and where to look.', files: ['Welcome guide.pdf', 'Working agreements.txt', 'Useful links'], question: 'What should I read before my first team meeting?' },
]

function Collections() {
  return <SiteLayout><main className="site-width">
    <PageIntroduction illustration="map" kicker="Collections" title="Related ideas. One shared home." description="Some knowledge belongs together. Collections are designed as simple groups of sources inside a workspace, shaped around the way your team thinks." />
    <p className="availability-note"><Folder className="fp-icon" aria-hidden="true" /> Illustrative examples · No collections or documents have been saved.</p>
    <section aria-label="Collection examples"><ConnectedSequence className="masonry">
      <article className="surface-raised panel tile-feature reveal"><Illustration name="map" size="wide" /><p className="section-kicker">01 / {examples[0].name}</p><h2>{examples[0].title}</h2><p>{examples[0].description}</p><p className="collection-question">“{examples[0].question}”</p><ul className="source-examples">{examples[0].files.map(file => <li key={file}><FileText className="fp-icon" aria-hidden="true" /><span>{file}</span></li>)}</ul></article>
      <article className="panel surface-tint reveal"><p className="section-kicker">02 / {examples[1].name}</p><h2>{examples[1].title}</h2><div className="surface-inset mini-preview"><div className="collection-sample-heading"><Folder className="fp-icon" aria-hidden="true" /><h3>{examples[1].name}</h3></div><ul className="source-examples">{examples[1].files.map(file => <li key={file}>{file.includes('link') ? <Link2 className="fp-icon" aria-hidden="true" /> : <FileText className="fp-icon" aria-hidden="true" />}<span>{file}</span></li>)}</ul></div><p>{examples[1].description}</p><p className="collection-question">“{examples[1].question}”</p></article>
      <article className="panel reveal"><p className="section-kicker">03 / {examples[2].name}</p><p className="tile-question">“{examples[2].question}”</p><h2>{examples[2].title}</h2><p>{examples[2].description}</p><p className="demo-label">{examples[2].files.join(' · ')}</p></article>
    </ConnectedSequence></section>
    <section className="reading-band"><div><Illustration name="filing" /><h2 className="section-title">Simple structure.<br />Shared context.</h2></div><div><p>Workspaces are the intended membership boundary. Collections help organize the information within them; they are not separate permission groups. Keep your source names clear and group documents around a question, a project, or a recurring topic.</p><Link to="/how-it-works" className="site-link">Follow the full workflow ↗</Link></div></section>
    <PageInvitation />
  </main></SiteLayout>
}