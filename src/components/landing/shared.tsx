import { Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { AlertTriangle, ArrowRight, ArrowUpRight, FileText, FolderOpen, Menu, RotateCcw, X } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { startEntry } from '@/components/app/entry'
import './landing.css'
import './pages.css'
import '../materials.css'
import './architecture.css'

/* ---------- helpers ---------- */

export const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n))
export const smooth = (t: number) => { const c = clamp(t); return c * c * (3 - 2 * c) }
export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const v = (o: Record<string, string | number>) => o as CSSProperties

/** Writes scroll progress to CSS variables (--p raw, --e eased) without re-rendering. */
export function useScrollProgress<T extends HTMLElement>(mode: 'through' | 'exit' = 'through') {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) { el.style.setProperty('--p', mode === 'exit' ? '0' : '0.6'); el.style.setProperty('--e', mode === 'exit' ? '0' : '1'); return }
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect(), vh = window.innerHeight
      const p = mode === 'exit' ? clamp(-r.top / Math.max(r.height * 0.8, 1)) : clamp((vh - r.top) / (vh + r.height))
      el.style.setProperty('--p', p.toFixed(4))
      el.style.setProperty('--e', smooth((p - 0.2) / 0.36).toFixed(4))
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); if (raf) cancelAnimationFrame(raf) }
  }, [mode])
  return ref
}

export function useInView<T extends HTMLElement>(threshold = 0.4) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, seen] as const
}

/* ---------- brand + header ---------- */

export function Mark({ size = 28 }: { size?: number }) {
  // Updated brand mark (orange footprint). Height follows the old mark so existing layouts keep their proportions.
  return <img src="/footprint-logo.png" alt="" aria-hidden="true" className="lp-mark" width={Math.round(size * 1.7 * 0.467)} height={Math.round(size * 1.7)} draggable={false} />
}

export const nav = [
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/collections', label: 'Collections' },
  { to: '/security', label: 'Security' },
  { to: '/pricing', label: 'Pricing' },
] as const

export type OpenHandler = (e: { preventDefault: () => void }) => void

export function useOpenApp() {
  const navigate = useNavigate()
  const open = useCallback<OpenHandler>(e => {
    e.preventDefault()
    startEntry(() => void navigate({ to: '/app' }))
  }, [navigate])
  return { open, reveal: false }
}

export function Header({ onOpen, tone = 'light' }: { onOpen: OpenHandler; tone?: 'light' | 'dark' }) {
  const { user, loading, signOut } = useAuth()
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    if (!menu) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [menu])
  return <header className="lp-header" data-scrolled={scrolled} data-tone={tone}>
    <div className="lp-header-bar">
      <Link to="/" className="lp-brand" aria-label="Footprint AI home"><Mark size={20} /><span>Footprint AI</span></Link>
      <nav className="lp-nav" aria-label="Main navigation">
        {nav.map(n => <Link key={n.to} to={n.to} className="lp-nav-link" activeProps={{ 'aria-current': 'page' }}>{n.label}</Link>)}
      </nav>
      <div className="lp-header-actions">
        {!loading && (user
          ? <button type="button" className="lp-nav-link lp-signin" onClick={() => void signOut()}>Log out</button>
          : <Link to="/login" className="lp-nav-link lp-signin">Sign in</Link>)}
        <Link to="/app" className="lp-btn lp-btn-primary" onClick={onOpen}>Open Footprint AI <ArrowRight size={16} aria-hidden="true" /></Link>
        <button type="button" className="lp-menu-btn" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} aria-controls="lp-mobile-nav" onClick={() => setMenu(m => !m)}>{menu ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </div>
    {menu && <nav id="lp-mobile-nav" className="lp-mobile-nav" aria-label="Mobile navigation">
      {nav.map(n => <Link key={n.to} to={n.to} className="lp-nav-link" onClick={() => setMenu(false)}>{n.label}</Link>)}
      {!loading && (user
        ? <button type="button" className="lp-nav-link" onClick={() => { setMenu(false); void signOut() }}>Log out</button>
        : <Link to="/login" className="lp-nav-link" onClick={() => setMenu(false)}>Sign in</Link>)}
    </nav>}
  </header>
}


/* ---------- shared reveal helpers ---------- */

export type Dir = 'up' | 'left' | 'right' | 'scale' | 'clip' | 'wipe-l' | 'wipe-r'
export function Reveal({ children, className = '', delay = 0, dir = 'up' }: { children: ReactNode; className?: string; delay?: number; dir?: Dir }) {
  const [ref, seen] = useInView<HTMLDivElement>(dir.startsWith('wipe') ? 0.01 : 0.15) // a wipe starts mostly clipped, so it needs a tiny threshold
  return <div ref={ref} className={`lp-reveal-in ${className}`} data-in={seen} data-dir={dir} style={v({ '--delay': `${delay}ms` })}>{children}</div>
}

/** Section wrapper that publishes scroll progress (--p) so child `Plane`s can drift at their own speed. */
export function Stage({ children, className = '', ...rest }: { children: ReactNode; className?: string } & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  const ref = useScrollProgress<HTMLElement>()
  return <section ref={ref} className={className} {...rest}>{children}</section>
}

/** Decorative material layer. Drifts vertically against scroll by `speed` px across the section's travel. */
export function Plane({ className = '', speed = 60 }: { className?: string; speed?: number }) {
  return <i className={`arc-plane ${className}`} style={v({ '--sp': speed })} aria-hidden="true" />
}

/** Reflective steel rail cut from stainless_steel_borders.png. */
export function Rail({ className = '' }: { className?: string }) {
  return <div className={`arc-rail ${className}`} aria-hidden="true" />
}

/** Text that slides out from behind a material edge: the wrapper clips, the content rises or slides into view. */
export function Emerge({ children, className = '', delay = 0, from = 'bottom' }: { children: ReactNode; className?: string; delay?: number; from?: 'bottom' | 'left' | 'right' }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.2)
  return <div ref={ref} className={`arc-emerge ${className}`} data-in={seen} data-from={from} style={v({ '--delay': `${delay}ms` })}><div className="arc-emerge-in">{children}</div></div>
}

/** Words darken progressively as the block scrolls through the viewport. */
export function WordReveal({ text, className = '' }: { text: string; className?: string }) {
  const ref = useScrollProgress<HTMLParagraphElement>()
  const words = text.split(' ')
  return <p ref={ref} className={`lp-words ${className}`}>
    {words.map((w, i) => <span key={i} style={v({ '--k': (i / words.length).toFixed(3) })}>{w} </span>)}
  </p>
}



/** Headline whose words rise out of a mask, staggered. Lines may carry the orange accent. */
export function SplitHeading({ lines, className = '', as: Tag = 'h1' }: { lines: { t: string; accent?: boolean }[]; className?: string; as?: 'h1' | 'h2' }) {
  const [ref, seen] = useInView<HTMLHeadingElement>(0.2)
  let i = 0
  return <Tag ref={ref} className={`lp-split-h ${className}`} data-in={seen}>
    {lines.map((l, li) => <span key={li} className={l.accent ? 'lp-line lp-accent' : 'lp-line'}>
      {l.t.split(' ').map((w, wi) => <span key={wi} className="lp-mask"><span style={v({ '--i': i++ })}>{w}</span>{' '}</span>)}
    </span>)}
  </Tag>
}

/** Closing band shared by the inner marketing pages: slate wedge, a steel plane, and glass crossing the seam between them. */
export function ClosingBand({ onOpen, joined = false, lean = 'r' }: { onOpen: OpenHandler; joined?: boolean; lean?: 'l' | 'r' }) {
  return <Stage className={`lp-section lp-dark lp-slate lp-closing-band arc-sec arc-wt arc-t-${lean}${joined ? ' lp-joined arc-pull' : ''}`} aria-label="Open Footprint AI">
    <div className="lp-dark-bg" aria-hidden="true" />
    <Plane className="arc-plane-closing" speed={50} />
    <div className="lp-inner">
      <Reveal dir="wipe-l" className="lp-lit lp-glass lp-closing">
        <h2 className="lp-h2">Give your team <span>one place to start.</span></h2>
        <div className="lp-actions">
          <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onOpen}>Open Footprint AI <ArrowRight size={18} aria-hidden="true" /></Link>
          <Link to="/how-it-works" className="lp-btn lp-btn-dark lp-btn-lg">See how it works</Link>
        </div>
      </Reveal>
      <footer className="lp-footer">
        <Link to="/" className="lp-brand" aria-label="Footprint AI home"><Mark size={16} /><span>Footprint AI</span></Link>
        <nav aria-label="Footer navigation">{nav.map(n => <Link key={n.to} to={n.to} className="lp-nav-link">{n.label}</Link>)}</nav>
      </footer>
    </div>
  </Stage>
}

/** Page frame for the inner marketing routes: shared header, closing band, white-light handoff, hover lighting. */
export function MarketingPage({ children, tone = 'light', endsDark = false, lean = 'r' }: { children: ReactNode; tone?: 'light' | 'dark'; endsDark?: boolean; lean?: 'l' | 'r' }) {
  const { open, reveal } = useOpenApp()
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) return
    const move = (e: PointerEvent) => {
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>('.lp-lit')
      if (!t) return
      const r = t.getBoundingClientRect()
      t.style.setProperty('--lx', `${e.clientX - r.left}px`)
      t.style.setProperty('--ly', `${e.clientY - r.top}px`)
    }
    el.addEventListener('pointermove', move)
    return () => el.removeEventListener('pointermove', move)
  }, [])
  return <div className="lp lp-page" data-tone={tone} ref={root}>
    <Header onOpen={open} tone={tone} />
    <main>{children}</main>
    <ClosingBand onOpen={open} joined={endsDark} lean={lean} />
    <div className="lp-reveal" data-on={reveal} aria-hidden="true" />
  </div>
}
