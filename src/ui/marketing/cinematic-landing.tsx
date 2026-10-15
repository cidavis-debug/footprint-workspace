import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useEntryTransition } from '@/ui/transition/entry-transition'
import { prefersReducedMotion, useCursorLight } from '@/ui/marketing/interactive'
import {
  ConclusionSection, IngestionSection, IntelligenceSection, NAV, ProblemSection, RadarSection, SecuritySection,
} from '@/ui/marketing/sections'
import {
  BLOCKS, heroScale, heroStillOpacity, parsePair, pinnedLength, textVisibility, videoProgress,
  type BlockId,
} from '@/ui/marketing/timeline'
import './landing.css'

const A = '/landing'

/* ------------------------------ Header ------------------------------ */

function Header() {
  const { user, loading, signOut } = useAuth()
  const { open } = useEntryTransition()
  const [hidden, setHidden] = useState(false)
  const [menu, setMenu] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    lastY.current = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const dy = y - lastY.current
      if (Math.abs(dy) > 4) { setHidden(y > 80 && dy > 0); lastY.current = y }
    }
    const onMove = (e: MouseEvent) => { if (e.clientY < 72) setHidden(false) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('mousemove', onMove) }
  }, [])

  const account = !loading && (user
    ? <button type="button" className="cin-link" onClick={() => void signOut()}>Log Out</button>
    : <Link to="/login" className="cin-link">Sign In</Link>)

  return <header className="cin-header" data-hidden={hidden && !menu} onKeyDown={e => { if (e.key === 'Escape') setMenu(false) }}>
    <Link to="/" className="cin-brand" aria-label="Footprint home"><span className="cin-slash" aria-hidden="true" />Footprint</Link>
    <nav className="cin-nav" aria-label="Main navigation">
      {NAV.map(n => <Link key={n.to} to={n.to} className="cin-link">{n.label}</Link>)}
    </nav>
    <div className="cin-actions">
      <span className="cin-account">{account}</span>
      <button type="button" className="cin-cta" onClick={open}><span>Open Footprint</span><span aria-hidden="true" className="cin-cta-arrow">→</span></button>
      <button type="button" className="cin-menu-btn" aria-expanded={menu} aria-controls="cin-mobile-nav" onClick={() => setMenu(m => !m)}>{menu ? 'Close' : 'Menu'}</button>
    </div>
    {menu && <nav id="cin-mobile-nav" className="cin-mobile-nav" aria-label="Mobile navigation">
      {NAV.map(n => <Link key={n.to} to={n.to} className="cin-link" onClick={() => setMenu(false)}>{n.label}</Link>)}
      {account}
    </nav>}
  </header>
}

/* --------------------- Chapter progress indicator --------------------- */

const CHAPTERS = [
  { id: 'overview', label: 'Overview' },
  { id: 'ingestion', label: 'Ingestion' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'radar', label: 'Change Radar' },
  { id: 'security', label: 'Security' },
] as const

function ChapterNav() {
  const [active, setActive] = useState<string>('overview')
  useEffect(() => {
    let raf = 0
    const compute = () => {
      raf = 0
      const probe = window.innerHeight * 0.45
      let current: string = CHAPTERS[0].id
      for (const c of CHAPTERS) {
        const el = document.getElementById(c.id === 'overview' ? 'problem' : c.id)
        if (el && el.getBoundingClientRect().top <= probe) current = c.id
      }
      // The pinned hero and its video belong to the overview chapter.
      if (window.scrollY < 40) current = 'overview'
      setActive(current)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute) }
    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  const go = (id: string) => {
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
    if (id === 'overview') { window.scrollTo({ top: 0, behavior }); return }
    document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' })
  }

  return <nav className="cin-chapters" aria-label="Page chapters" data-light={active === 'radar'}>
    <ol>
      {CHAPTERS.map(c => <li key={c.id}>
        <button type="button" aria-current={active === c.id ? 'step' : undefined} onClick={() => go(c.id)}>
          <span className="cin-chapter-label">{c.label}</span><i aria-hidden="true" />
        </button>
      </li>)}
    </ol>
  </nav>
}

/* ---------------------- Cinematic block engine ---------------------- */

type Spec = { in?: [number, number]; out?: [number, number]; from?: 'left' | 'up' | 'none' }
/** Attributes read by the block engine (a no-op until the engine is active). */
const motion = (spec: Spec): Record<string, string> => {
  const attrs: Record<string, string> = { 'data-t': '', 'data-from': spec.from ?? 'none' }
  if (spec.in) attrs['data-in'] = spec.in.join(',')
  if (spec.out) attrs['data-out'] = spec.out.join(',')
  return attrs
}

const FALLBACK_DURATION = { v1: 6.08, v2: 6.08, v4: 5.125 } as const

/**
 * Pins a stage while its video scrubs with scroll, then releases into normal page flow.
 * The same DOM renders on the server and on small/reduced-motion clients (a plain still);
 * `active` only turns on the pinned track, the video and the scroll engine.
 */
function CinematicBlock({ id, active, children, className = '' }: { id: BlockId; active: boolean; children: ReactNode; className?: string }) {
  const track = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active) return
    const trackEl = track.current, stageEl = stage.current
    if (!trackEl || !stageEl) return
    const video = stageEl.querySelector('video')
    const still = stageEl.querySelector<HTMLElement>('[data-hero-still]')
    const zoomers = [...stageEl.querySelectorAll<HTMLElement>('[data-zoom]')]
    const texts = [...stageEl.querySelectorAll<HTMLElement>('[data-t]')]
    const pinned = pinnedLength(id)
    let raf = 0
    let lastU = Number.NaN
    let pending = false

    const apply = (u: number) => {
      pending = false
      if (id === 'intro') {
        const s = heroScale(u)
        for (const el of zoomers) el.style.transform = `scale(${s.toFixed(4)})`
        if (still) still.style.opacity = heroStillOpacity(u).toFixed(3)
      }
      if (video) {
        const name = BLOCKS[id].video
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : FALLBACK_DURATION[name]
        const target = Math.min(dur - 0.02, videoProgress(id, u) * dur)
        const gap = Math.abs(video.currentTime - target)
        if (gap > 1 / 60) {
          pending = true
          if (!video.seeking) {
            if (gap > 0.6 && 'fastSeek' in video) video.fastSeek(target)
            else video.currentTime = target
          }
        }
      }
      for (const el of texts) {
        const d = el.dataset
        const inR = parsePair(d['in']), outR = parsePair(d['out'])
        const { entered, exited, visible } = textVisibility({ ...(inR ? { in: inR } : {}), ...(outR ? { out: outR } : {}) }, u)
        const from = d['from']
        const x = from === 'left' ? -(1 - entered) * 48 : 0
        const y = from === 'up' ? (1 - entered) * 22 - exited * 14 : 0
        el.style.opacity = visible.toFixed(3)
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
        el.style.pointerEvents = visible < 0.05 ? 'none' : ''
      }
    }

    const tick = () => {
      const vh = window.innerHeight
      const rect = trackEl.getBoundingClientRect()
      if (rect.top < vh * 1.5 && rect.bottom > -vh * 0.5) {
        const u = Math.min(pinned, Math.max(0, -rect.top / vh))
        if (u !== lastU || pending) { lastU = u; apply(u) }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      for (const el of [...zoomers, ...texts, ...(still ? [still] : [])]) { el.style.transform = ''; el.style.opacity = '' }
    }
  }, [id, active])

  return <div ref={track} className={`cin-track ${className}`} data-active={active} style={active ? { height: `${BLOCKS[id].height * 100}vh` } : undefined}>
    <div ref={stage} className="cin-stage">{children}</div>
  </div>
}

/* ------------------------------ Blocks ------------------------------ */

function HeroCopy({ active }: { active: boolean }) {
  // Fully visible on load. When the user scrolls, the engine shifts and fades these out.
  const out = (range: [number, number]) => (active ? motion({ out: range, from: 'up' }) : {})
  return <div className="cin-hero-copy">
    <h1 className="cin-display cin-hero-h" {...out([0.3, 0.7])}>Complex Engineering.<br />Connected Intelligence.</h1>
    <div className="cin-hero-sub" {...out([0.25, 0.65])}>
      <p className="cin-hero-lead">Footprint helps hardware engineering teams organize scattered information, ask AI-powered questions across their sources, and spot potential inconsistencies early.</p>
      <p className="cin-hero-audience">For systems, mechanical, electrical and test engineers.</p>
    </div>
    <div className="cin-scroll-hint" aria-hidden="true" {...(active ? motion({ out: [0.1, 0.35] }) : {})}><span className="cin-mono">Scroll</span><i /></div>
  </div>
}

function IntroBlock({ active }: { active: boolean }) {
  return <CinematicBlock id="intro" active={active} className="cin-intro">
    <div className="cin-frame" aria-hidden="true">
      {active && <video data-zoom className="cin-fill cin-zoom" src={`${A}/v1.mp4`} poster={`${A}/v1-first.jpg`} muted playsInline preload="auto" disablePictureInPicture tabIndex={-1} />}
      <img data-zoom data-hero-still className="cin-fill cin-zoom cin-hero-img" src={`${A}/hero.jpg`} alt="" />
      <div className="cin-vignette" />
    </div>
    <div className="cin-static-shade" aria-hidden="true" />
    <HeroCopy active={active} />
    {active && <p className="cin-caption" {...motion({ in: [1.1, 1.45], from: 'up' })}>Behind every part is a trail of documents, drawings and decisions.</p>}
  </CinematicBlock>
}

function StreamBlock({ active }: { active: boolean }) {
  return <CinematicBlock id="stream" active={active} className="cin-band">
    <div className="cin-frame" aria-hidden="true">
      <img className="cin-fill" src={`${A}/v2-last.jpg`} alt="" loading="lazy" />
      {active && <video className="cin-fill" src={`${A}/v2.mp4`} poster={`${A}/v2-first.jpg`} muted playsInline preload="metadata" disablePictureInPicture tabIndex={-1} />}
      <div className="cin-vignette" />
      <div className="cin-stream-veil" {...(active ? motion({ in: [0.55, 0.9] }) : {})} />
    </div>
    <p className="cin-caption" {...(active ? motion({ in: [0.45, 0.8], from: 'up' }) : {})}>Every source, connected into one body of knowledge.</p>
  </CinematicBlock>
}

function VaultBlock({ active }: { active: boolean }) {
  return <CinematicBlock id="vault" active={active} className="cin-band">
    <div className="cin-frame" aria-hidden="true">
      <img className="cin-fill cin-vault-video" src={`${A}/v4-last.jpg`} alt="" loading="lazy" />
      {active && <video className="cin-fill cin-vault-video" src={`${A}/v4.mp4`} poster={`${A}/v4-first.jpg`} muted playsInline preload="metadata" disablePictureInPicture tabIndex={-1} />}
      <div className="cin-vignette" />
    </div>
    <p className="cin-caption" {...(active ? motion({ in: [0.85, 1.15], from: 'up' }) : {})}>Built to keep your engineering information inside your workspace.</p>
  </CinematicBlock>
}

/* ------------------------------ Page ------------------------------ */

export function CinematicLanding() {
  const [cinematic, setCinematic] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference) and (hover: hover)')
    const update = () => setCinematic(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  useCursorLight()

  return <div className="cin" data-mode={cinematic ? 'cinematic' : 'static'}>
    <Header />
    <ChapterNav />
    <main>
      <IntroBlock active={cinematic} />
      <ProblemSection bridge="v1-last.jpg" />
      <IngestionSection />
      <StreamBlock active={cinematic} />
      <IntelligenceSection bridge="v2-last.jpg" />
      <RadarSection />
      <VaultBlock active={cinematic} />
      <SecuritySection bridge="v4-last.jpg" />
      <ConclusionSection />
    </main>
  </div>
}
