import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { pageHead } from '@/components/page-head'
import { MarketingPage, Reveal, SplitHeading, useScrollProgress } from '@/components/landing/shared'

export const Route = createFileRoute('/security')({
  head: () => pageHead('Security & data boundaries — Footprint AI', 'What Footprint AI does to keep your sources inside your workspace, what is sent to the AI provider, and what it does not claim.'),
  component: Security,
})

const journey = [
  { id: 'signin', label: 'Sign in', title: 'Every request is made as you.',
    body: 'Footprint AI uses email and password sign-in. Once you are signed in, your session token accompanies each request to the server, and server functions reject requests without it.',
    sent: 'Your session token', stored: 'Your account and its workspaces' },
  { id: 'upload', label: 'Upload', title: 'Files land in your workspace’s folder.',
    body: 'An uploaded file is stored under your workspace’s folder, and a source record is created. For Markdown and text files, the first part of the text is kept with the record so it can be used for answers.',
    sent: 'Nothing leaves Footprint AI at this step', stored: 'The file, a source record, and a text excerpt for Markdown and text files' },
  { id: 'ask', label: 'Ask', title: 'Your question and source excerpts go to Gemini.',
    body: 'To answer, the server loads the active workspace’s sources, extracted claims and open alerts, then sends your question and that source text to Google’s Gemini API. This is not local-only processing. The AI key is held on the server, never in the browser. The question and answer are saved to the workspace’s conversation history.',
    sent: 'Your question and excerpts from the active workspace', stored: 'The question, the answer and its citations' },
  { id: 'remove', label: 'Remove', title: 'Removing a source removes its file.',
    body: 'Remove a source from the workspace and its record is deleted, along with the uploaded file stored for it.',
    sent: 'Nothing', stored: 'Nothing further: the record and file are deleted' },
] as const

function DataJourney() {
  const [i, setI] = useState(2)
  const cur = journey[i]!
  return <div className="lp-lit lp-steel lp-steel-dark lp-djourney">
    <div role="tablist" aria-label="Data journey" className="lp-dtabs">
      {journey.map((j, n) => <button key={j.id} role="tab" type="button" id={`tab-${j.id}`} aria-selected={n === i} aria-controls="dj-panel" onClick={() => setI(n)}><span className="lp-mono">0{n + 1}</span>{j.label}</button>)}
    </div>
    <div id="dj-panel" role="tabpanel" aria-labelledby={`tab-${cur.id}`} key={cur.id} className="lp-dpanel">
      <h3>{cur.title}</h3>
      <p>{cur.body}</p>
      <dl>
        <div><dt className="lp-mono">Sent onward</dt><dd>{cur.sent}</dd></div>
        <div><dt className="lp-mono">Kept in your workspace</dt><dd>{cur.stored}</dd></div>
      </dl>
    </div>
  </div>
}

const verified = [
  { h: 'Access is owner-only', t: 'Workspaces, collections, sources, conversations and engineering findings are protected by row-level rules that tie them to the workspace owner.' },
  { h: 'File access follows the workspace', t: 'Rules on the file store scope reads, uploads and deletes to the folder of a workspace you own.' },
  { h: 'Credentials stay on the server', t: 'The AI provider key is read on the server and is not sent to your browser.' },
  { h: 'Citations you can open', t: 'Answers list the sources they used, and the evidence drawer shows the excerpt behind each one.' },
] as const

function Security() {
  const parallax = useScrollProgress<HTMLElement>('exit')
  return <MarketingPage tone="dark">
    <section className="lp-pagehero lp-dark lp-slate lp-sec-hero" ref={parallax}>
      <div className="lp-dark-bg" aria-hidden="true" />
      <div className="lp-inner lp-sec-hero-inner">
        <div className="lp-sec-hero-copy">
          <p className="lp-mono lp-eyebrow">Security & data boundaries</p>
          <SplitHeading className="lp-mega" lines={[{ t: 'Clear boundaries.' }, { t: 'Plainly stated.', accent: true }]} />
          <Reveal delay={500}><p className="lp-lead">Trust starts with being specific about what a product does, and what it does not. This is what Footprint AI does today.</p></Reveal>
        </div>
        <div className="lp-sec-stack">
          <Reveal dir="left" delay={250} className="lp-lit lp-glass lp-sec-pane p1"><span className="lp-mono">Access</span><b>Owner-only workspaces</b><p>Row-level rules tie your data to your account.</p></Reveal>
          <Reveal dir="right" delay={380} className="lp-lit lp-glass lp-sec-pane p2"><span className="lp-mono">AI requests</span><b>Excerpts go to Gemini</b><p>Your question and relevant source text are sent to answer it.</p></Reveal>
          <Reveal dir="up" delay={510} className="lp-lit lp-glass lp-sec-pane p3"><span className="lp-mono">Control</span><b>Remove any source</b><p>The record and its uploaded file are deleted.</p></Reveal>
        </div>
      </div>
    </section>

    <section className="lp-section lp-sec-verified" aria-labelledby="lp-ver-h">
      <div className="lp-inner lp-ver-grid">
        <Reveal dir="left"><p className="lp-mono lp-eyebrow">In the product today</p><h2 id="lp-ver-h" className="lp-h2">Four things you <span>can rely on.</span></h2></Reveal>
        <ul className="lp-ver-list">
          {verified.map((x, i) => <li key={x.h}><Reveal dir={i % 2 ? 'right' : 'up'} delay={i * 80} className="lp-lit lp-steel"><b>{x.h}</b><p>{x.t}</p></Reveal></li>)}
        </ul>
      </div>
    </section>

    <section className="lp-section lp-dark lp-slate lp-sec-journey" aria-labelledby="lp-dj-h">
      <div className="lp-dark-bg" aria-hidden="true" />
      <div className="lp-inner">
        <Reveal dir="up" className="lp-dj-head"><p className="lp-mono lp-eyebrow">Follow your data</p><h2 id="lp-dj-h" className="lp-h2">What is sent. <span>What is kept.</span></h2></Reveal>
        <Reveal dir="up" delay={100}><DataJourney /></Reveal>
      </div>
    </section>

    <section className="lp-section lp-sec-claims" aria-labelledby="lp-nc-h">
      <div className="lp-inner lp-nc-grid">
        <Reveal dir="left"><p className="lp-mono lp-eyebrow">What we do not claim</p><h2 id="lp-nc-h" className="lp-h2">No inflated <span>claims.</span></h2></Reveal>
        <Reveal dir="right" delay={140} className="lp-nc-copy">
          <p className="lp-body">Footprint AI does not claim SOC 2 certification, HIPAA compliance, end-to-end encryption or a verified data-retention policy. Those assurances need separate implementation and independent review.</p>
          <p className="lp-body">Saving a Google Drive or OneDrive link does not give Footprint AI access to its private contents. Links are references only.</p>
          <p className="lp-body">Because answers are generated by an external AI provider, do not add information you are not permitted to share with that provider.</p>
          <Link to="/how-it-works" className="lp-textlink lp-textlink-ink">See how sources work <ArrowRight size={15} aria-hidden="true" /></Link>
        </Reveal>
      </div>
    </section>
  </MarketingPage>
}
