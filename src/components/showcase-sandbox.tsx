import { useState } from 'react'
import { Answer, Button, Icon } from '@/design-system/footprint-0a8b1a'
import { Illustration } from '@/components/illustration'
import { demoQuestion, useHeroDemo } from '@/components/showcase-motion'

const examples = [
  { id: 'launch', name: 'Launch checklist.pdf', question: demoQuestion, opening: 'The example launch notes point to three priorities:', points: ['Make onboarding simple so new users reach their first useful result.', 'Confirm launch owners, outstanding decisions, and the support handoff.', 'Agree on what to measure and review the first week together.'] },
  { id: 'research', name: 'Research summary.txt', question: 'Which concerns came up most often in the research?', opening: 'In this example research summary, three themes recur:', points: ['People want a clearer starting point, rather than another empty workspace.', 'Source names and visible attribution make answers easier to assess.', 'A simple handoff matters more than adding another layer of organization.'] },
  { id: 'team', name: 'Team notes.docx', question: 'What should I read before my first team meeting?', opening: 'The example team notes suggest a short reading list:', points: ['Start with the team’s working agreements and meeting rhythm.', 'Read the current project brief to understand the goal and owners.', 'Bring one open question to the meeting and record the decision afterward.'] },
]

export function ShowcaseSandbox() {
  const [selected, setSelected] = useState(examples[0])
  const [asked, setAsked] = useState(examples[0])
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState('')
  const demo = useHeroDemo(asked.question)
  const choose = (id: string) => {
    const example = examples.find(item => item.id === id)
    if (!example) return
    setSelected(example)
    setNotice(`Example context selected: ${example.name}.`)
  }
  return <>
    <div className="product-preview">
      <div className="preview-top"><span className="flex items-center gap-2 text-sm"><Icon name="Folder" size="sm" /> Studio workspace</span><div className="demo-controls"><span className="demo-label">Illustrative sandbox</span>{demo.controls}</div></div>
      <div className="sandbox-context">
        <div className="sandbox-sources" aria-label="Example sources">{examples.map(example => <Button key={example.id} variant={selected.id === example.id ? 'secondary' : 'quiet'} size="sm" aria-pressed={selected.id === example.id} draggable onDragStart={event => { event.dataTransfer.setData('application/x-footprint-example', example.id); event.dataTransfer.effectAllowed = 'copy' }} onDragEnd={() => setDragging(false)} onClick={() => choose(example.id)}><Icon name="FileText" size="sm" />{example.name}</Button>)}</div>
        <div className="sandbox-drop" data-dragging={dragging} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false) }} onDrop={event => {
          event.preventDefault(); setDragging(false)
          const id = event.dataTransfer.getData('application/x-footprint-example')
          if (examples.some(example => example.id === id)) choose(id)
          else setNotice('Only the example sources are supported here. Your files have not been read or uploaded.')
        }}>
          <span className="demo-label">Example context</span><span className="sandbox-context-name"><Icon name="FileText" size="sm" />{selected.name}</span>
        </div>
        <div className="sandbox-prompt"><p>{selected.question}</p><Button variant="ghost" onClick={() => { setAsked(selected); setNotice(`Showing the prewritten ${selected.name} example.`) }}><Icon name="Sparkles" size="sm" />Ask example<Icon name="ArrowUpRight" size="sm" /></Button></div>
        <p className="sandbox-notice" role="status">{notice || 'Example sources only · Nothing is uploaded or sent.'}</p>
      </div>
      <div className="preview-body">
        <div ref={demo.ref} className="question typewriter-question"><span className="question-reserve">{asked.question}</span><span className="typed-question" aria-hidden="true">{demo.text}<span className="typewriter-cursor" data-active={!demo.complete} /></span><span className="sr-only">{asked.question}</span></div>
        <div className="demo-response" data-complete={demo.complete} aria-hidden={!demo.complete} inert={!demo.complete}>
          <div className="answer-heading"><Illustration name="answer" size="small" /><span>Footprint AI</span></div>
          <Answer key={asked.id} sources={[`${asked.name} · Example source`]} copyText={`${asked.opening}\n${asked.points.join('\n')}`}><p>{asked.opening}</p><ol className="preview-list">{asked.points.map(point => <li key={point}>{point}</li>)}</ol></Answer>
        </div>
      </div>
    </div>
    <p className="preview-note">Prewritten example answers, not live AI responses.</p>
  </>
}