import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Scroll-triggered reveal. Content is visible in the server HTML and when JS is unavailable;
 * on the client, elements that start below the fold are hidden until they scroll into view.
 */
export function Rv({ as = 'div', delay = 0, className = '', children, ...rest }: {
  as?: 'div' | 'p' | 'h2' | 'h3' | 'li' | 'article' | 'ul'
  delay?: number
  className?: string
  children?: ReactNode
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) return
    el.dataset['rv'] = 'pre'
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { delete el.dataset['rv']; io.disconnect() }
    }, { rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return createElement(as, { ref, className: `cin-rv ${className}`.trim(), style: { '--d': `${delay}ms` } as CSSProperties, ...rest }, children)
}

/**
 * Soft orange glow on `.cin-glow` elements that follows the cursor with distance falloff.
 * One passive listener, one rAF per pointer move; skipped on touch devices and for reduced motion.
 */
export function useProximityGlow() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return
    let raf = 0
    let x = 0
    let y = 0
    const run = () => {
      raf = 0
      for (const el of document.querySelectorAll<HTMLElement>('.cin-glow')) {
        const r = el.getBoundingClientRect()
        if (r.bottom < -200 || r.top > window.innerHeight + 200) continue
        const nx = Math.min(r.right, Math.max(r.left, x))
        const ny = Math.min(r.bottom, Math.max(r.top, y))
        const falloff = Math.min(1, Math.max(0, 1 - Math.hypot(x - nx, y - ny) / 280))
        el.style.setProperty('--mx', `${(x - r.left).toFixed(0)}px`)
        el.style.setProperty('--my', `${(y - r.top).toFixed(0)}px`)
        el.style.setProperty('--gi', falloff.toFixed(2))
      }
    }
    const onMove = (e: PointerEvent) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(run) }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => { window.removeEventListener('pointermove', onMove); if (raf) cancelAnimationFrame(raf) }
  }, [])
}

export type CycleItem = {
  id: string
  /** Short label shown in the list. */
  label: string
  /** Mono tag above the detail, e.g. "QUESTION". */
  tag: string
  title: string
  /** Source types the example would draw on. */
  sources: string[]
  body: string
}

/**
 * Cycling cards. Every item is listed and selectable at all times, so nothing depends on waiting for
 * the cycle. Auto-advance pauses on hover/focus, when offscreen, via the Pause button, and for reduced motion.
 */
export function CyclingCards({ items, label, interval = 6500 }: { items: CycleItem[]; label: string; interval?: number }) {
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState(false)
  const [manualPause, setManualPause] = useState(false)
  const [visible, setVisible] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const running = visible && !hover && !manualPause && !prefersReducedMotion()
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setActive(i => (i + 1) % items.length), interval)
    return () => window.clearInterval(t)
  }, [running, items.length, interval, active])

  const item = items[active] ?? items[0]!
  return <div ref={root} className="cin-cycle" role="group" aria-label={label}
    onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
    <ul className="cin-cycle-list">
      {items.map((it, i) => <li key={it.id}>
        <button type="button" className="cin-cycle-tab" aria-pressed={i === active} onClick={() => setActive(i)}>
          <span className="cin-mono">{String(i + 1).padStart(2, '0')}</span>{it.label}
        </button>
      </li>)}
    </ul>
    <article className="cin-cycle-card cin-glow" key={item.id} aria-live="off">
      <p className="cin-mono cin-kicker">{item.tag}</p>
      <h3 className="cin-cycle-q">{item.title}</h3>
      <p className="cin-mono cin-cycle-label">Draws on</p>
      <ul className="cin-tags">{item.sources.map(s => <li key={s}>{s}</li>)}</ul>
      <p className="cin-cycle-body">{item.body}</p>
    </article>
    <div className="cin-cycle-controls">
      <button type="button" className="cin-link" onClick={() => setManualPause(p => !p)} aria-pressed={manualPause}>{manualPause ? 'Resume' : 'Pause'} examples</button>
    </div>
  </div>
}
