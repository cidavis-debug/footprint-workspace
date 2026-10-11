import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Decorative paths stay in the gaps between items, beneath the public header. */
export function ConnectedSequence({ children, className }: { children: ReactNode; className: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [drawing, setDrawing] = useState({ paths: [] as string[], width: 1, height: 1, progress: 0 })
  useEffect(() => {
    const element = host.current
    if (!element) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const measure = () => {
      frame = 0
      const bounds = element.getBoundingClientRect()
      const items = Array.from(element.children).filter(child => child.tagName === 'ARTICLE').map(child => child.getBoundingClientRect())
      const paths = items.slice(1).map((next, index) => {
        const previous = items[index]
        if (!previous) return ''
        const horizontal = previous.right <= next.left
        const x1 = (horizontal ? previous.right : previous.left + previous.width / 2) - bounds.left
        const y1 = (horizontal ? previous.top + previous.height / 2 : previous.bottom) - bounds.top
        const x2 = (horizontal ? next.left : next.left + next.width / 2) - bounds.left
        const y2 = (horizontal ? next.top + next.height / 2 : next.top) - bounds.top
        return horizontal
          ? `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1 - (x2 - x1) / 3}, ${(x1 + x2) / 2} ${y2 + (x2 - x1) / 3}, ${x2} ${y2}`
          : `M ${x1} ${y1} C ${x1 - (y2 - y1) / 3} ${(y1 + y2) / 2}, ${x2 + (y2 - y1) / 3} ${(y1 + y2) / 2}, ${x2} ${y2}`
      })
      const progress = preference.matches ? 1 : Math.max(0, Math.min(1, (window.innerHeight - bounds.top) / Math.min(bounds.height, window.innerHeight)))
      setDrawing({ paths, width: bounds.width || 1, height: bounds.height || 1, progress })
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(element)
    Array.from(element.children).forEach(child => { if (child.tagName === 'ARTICLE') observer.observe(child) })
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    preference.addEventListener('change', schedule)
    schedule()
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      preference.removeEventListener('change', schedule)
    }
  }, [])
  return <div ref={host} className={`connected-sequence ${className}`}>
    <svg className="ink-connectors" viewBox={`0 0 ${drawing.width} ${drawing.height}`} preserveAspectRatio="none" aria-hidden="true">
      {drawing.paths.map((path, index) => <path key={index} d={path} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - Math.max(0, Math.min(1, drawing.progress * drawing.paths.length - index))} />)}
    </svg>
    {children}
  </div>
}