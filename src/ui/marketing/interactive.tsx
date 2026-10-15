import { createElement, useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useRef } from 'react'

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Scroll-triggered reveal. Content is visible in the server HTML and when JS is unavailable;
 * on the client, elements that start below the fold are hidden until they scroll into view.
 */
export function Rv({ as = 'div', delay = 0, className = '', children, ...rest }: {
  as?: 'div' | 'p' | 'h2' | 'h3' | 'li' | 'article' | 'ul' | 'ol' | 'span'
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

/** True while the element is meaningfully on screen. */
export function useInView(ref: RefObject<Element | null>, threshold = 0.35) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, threshold])
  return inView
}

/**
 * Cursor-reactive illumination, driven by a single passive pointer listener and one rAF per move:
 *  - `.cin-glow` elements get a local glow (--mx/--my/--gi) that falls off with distance.
 *  - The `.cin` root gets --px/--py so sections can draw a soft page-level spotlight.
 * Skipped on touch devices and for reduced motion.
 */
export function useCursorLight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return
    const root = document.querySelector<HTMLElement>('.cin')
    let raf = 0
    let x = 0
    let y = 0
    const run = () => {
      raf = 0
      root?.style.setProperty('--px', `${x}px`)
      root?.style.setProperty('--py', `${y}px`)
      for (const el of document.querySelectorAll<HTMLElement>('.cin-glow')) {
        const r = el.getBoundingClientRect()
        if (r.bottom < -200 || r.top > window.innerHeight + 200) continue
        const nx = Math.min(r.right, Math.max(r.left, x))
        const ny = Math.min(r.bottom, Math.max(r.top, y))
        const falloff = Math.min(1, Math.max(0, 1 - Math.hypot(x - nx, y - ny) / 300))
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

/**
 * Auto-advancing index that pauses on hover/focus, while offscreen, when manually paused,
 * and for reduced motion. Selecting an item manually restarts the timer.
 */
export function useCycle(count: number, { interval = 6000, paused = false, active = true }: { interval?: number; paused?: boolean; active?: boolean }) {
  const [index, setIndex] = useState(0)
  const running = active && !paused && !prefersReducedMotion() && count > 1
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setIndex(i => (i + 1) % count), interval)
    return () => window.clearInterval(t)
  }, [running, count, interval, index])
  return [index, setIndex] as const
}
