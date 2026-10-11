import { useEffect, useRef, useState } from 'react'
import { Button } from '@/design-system/footprint-0a8b1a'
import logoAsset from '@/assets/footprint-mark.png.asset.json'

export const demoQuestion = 'What should we focus on before the next product launch?'

/** Browser-only motion preferences; the server always renders readable content. */
function useMotionPreference() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setEnabled(!query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return enabled
}

export function useHeroDemo(question = demoQuestion) {
  const motionEnabled = useMotionPreference()
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [characters, setCharacters] = useState(0)
  const [pageVisible, setPageVisible] = useState(true)
  useEffect(() => { setCharacters(0); setPaused(false) }, [question])
  useEffect(() => {
    const element = ref.current
    if (!element || !motionEnabled) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setStarted(true); observer.disconnect() }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [motionEnabled])
  useEffect(() => {
    const update = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  useEffect(() => {
    if (!motionEnabled || !started || paused || !pageVisible || characters >= question.length) return
    const timer = window.setTimeout(() => setCharacters(count => count + 1), 55)
    return () => window.clearTimeout(timer)
  }, [motionEnabled, started, paused, characters, pageVisible, question])
  const complete = !motionEnabled || characters >= question.length
  return {
    ref, complete,
    text: motionEnabled ? question.slice(0, characters) : question,
    controls: motionEnabled ? <Button variant="ghost" size="icon" aria-label={complete ? 'Replay example' : paused ? 'Resume example' : 'Pause example'} title={complete ? 'Replay example' : paused ? 'Resume example' : 'Pause example'} onClick={() => {
      if (complete) { setCharacters(0); setStarted(true); setPaused(false) }
      else setPaused(value => !value)
    }}><span aria-hidden="true">{complete ? '↻' : paused ? '▶' : 'Ⅱ'}</span></Button> : null,
  }
}

export function FootprintStepTrail() {
  const ref = useRef<HTMLDivElement>(null)
  const motionEnabled = useMotionPreference()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element || !motionEnabled) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setVisible(true); observer.disconnect() }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [motionEnabled])
  return <div ref={ref} className="footprint-trail" data-visible={visible || !motionEnabled} aria-hidden="true">
    {[0, 1, 2].map(index => <img key={index} src={logoAsset.url} alt="" className="trail-mark" />)}
  </div>
}