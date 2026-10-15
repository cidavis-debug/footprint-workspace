import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { openFootprint } from '@/ui/marketing/open-footprint'
import { useProximityGlow } from '@/ui/marketing/interactive'
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

function useOpenFootprint() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const router = useRouter()
  return () => {
    const to = user ? '/app' : '/login'
    openFootprint({
      authed: !!user,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      navigate: () => (user ? navigate({ to: '/app' }) : navigate({ to: '/login', search: { redirect: '/app' } })),
      preload: () => router.preloadRoute({ to }),
    })
  }
}

function Header() {
  const { user, loading, signOut } = useAuth()
  const open = useOpenFootprint()
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

/* ---------------------- Cinematic block engine ---------------------- */

type Spec = { in?: [number, number]; out?: [number, number]; from?: 'left' | 'up' | 'none' }
/** Attributes read by the block engine (a no-op in static mode). */
const motion = (on: boolean, spec: Spec): Record<string, string> => {
  if (!on) return {}
  const attrs: Record<string, string> = { 'data-t': '', 'data-from': spec.from ?? 'none' }
  if (spec.in) attrs['data-in'] = spec.in.join(',')
  if (spec.out) attrs['data-out'] = spec.out.join(',')
  return attrs
}

const FALLBACK_DURATION = { v1: 6.08, v2: 6.08, v4: 5.125 } as const

/** Pins a stage while its video scrubs with scroll, then releases into normal page flow. */
function CinematicBlock({ id, children }: { id: BlockId; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
      // Only do work while the block is near the viewport.
      if (rect.top < vh * 1.5 && rect.bottom > -vh * 0.5) {
        const u = Math.min(pinned, Math.max(0, -rect.top / vh))
        if (u !== lastU || pending) { lastU = u; apply(u) }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [id])

  return <div ref={track} className="cin-track" style={{ height: `${BLOCKS[id].height * 100}vh` }}>
    <div ref={stage} className="cin-stage">{children}</div>
  </div>
}

/* ----------------------------- Hero copy ----------------------------- */

function HeroCopy({ on }: { on: boolean }) {
  return <div className="cin-hero-copy">
    <h1 className="cin-display cin-hero-h" {...motion(on, { out: [0.35, 0.75], from: 'up' })}>Complex Engineering.<br />Connected Intelligence.</h1>
    <div className="cin-hero-sub" {...motion(on, { out: [0.3, 0.7], from: 'up' })}>
      <p className="cin-hero-lead">Footprint is an AI-powered engineering knowledge platform for hardware teams.</p>
      <p>Organize your drawings, specifications and reports in one workspace, ask questions across them and get cited answers, and see where your sources may disagree.</p>
    </div>
    <div className="cin-scroll-hint" aria-hidden="true" {...motion(on, { out: [0.1, 0.35] })}><span className="cin-mono">Scroll</span><i /></div>
  </div>
}

function Caption({ on, spec, children }: { on: boolean; spec: Spec; children: ReactNode }) {
  return <p className="cin-caption" {...motion(on, spec)}>{children}</p>
}

/* ------------------------------ Blocks ------------------------------ */

function IntroBlock() {
  return <CinematicBlock id="intro">
    <div className="cin-frame" aria-hidden="true">
      <video data-zoom className="cin-fill cin-zoom" src={`${A}/v1.mp4`} poster={`${A}/v1-first.jpg`} muted playsInline preload="auto" disablePictureInPicture tabIndex={-1} />
      <img data-zoom data-hero-still className="cin-fill cin-zoom cin-hero-img" src={`${A}/hero.jpg`} alt="" />
      <div className="cin-vignette" />
    </div>
    <HeroCopy on />
    <Caption on spec={{ in: [1.1, 1.45], from: 'up' }}>Behind every part is a trail of documents, drawings and decisions.</Caption>
  </CinematicBlock>
}

function StreamBlock() {
  return <CinematicBlock id="stream">
    <div className="cin-frame" aria-hidden="true">
      <video className="cin-fill" src={`${A}/v2.mp4`} poster={`${A}/v2-first.jpg`} muted playsInline preload="metadata" disablePictureInPicture tabIndex={-1} />
      <div className="cin-vignette" />
      <div className="cin-stream-veil" {...motion(true, { in: [0.55, 0.9] })} />
    </div>
    <Caption on spec={{ in: [0.45, 0.8], from: 'up' }}>Every source, connected into one body of knowledge.</Caption>
  </CinematicBlock>
}

function VaultBlock() {
  return <CinematicBlock id="vault">
    <div className="cin-frame" aria-hidden="true">
      <video className="cin-fill cin-vault-video" src={`${A}/v4.mp4`} poster={`${A}/v4-first.jpg`} muted playsInline preload="metadata" disablePictureInPicture tabIndex={-1} />
      <div className="cin-vignette" />
    </div>
    <Caption on spec={{ in: [0.85, 1.15], from: 'up' }}>Built to keep your engineering information inside your workspace.</Caption>
  </CinematicBlock>
}

/** Mobile / reduced-motion stand-ins for the cinematic blocks: a still plus the same message. */
function StaticBand({ image, children }: { image: string; children: ReactNode }) {
  return <section className="cin-static-band">
    <img src={`${A}/${image}`} alt="" loading="lazy" aria-hidden="true" />
    <p className="cin-caption">{children}</p>
  </section>
}

function StaticIntro() {
  return <section className="cin-static-hero">
    <img className="cin-static-bg cin-hero-img" src={`${A}/hero.jpg`} alt="" aria-hidden="true" />
    <div className="cin-static-shade" aria-hidden="true" />
    <HeroCopy on={false} />
  </section>
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
  useProximityGlow()

  return <div className="cin" data-mode={cinematic ? 'cinematic' : 'static'}>
    <Header />
    <main>
      {cinematic ? <IntroBlock /> : <StaticIntro />}
      <ProblemSection bridge="v1-last.jpg" />
      <IngestionSection />
      {cinematic ? <StreamBlock /> : <StaticBand image="v2-last.jpg">Every source, connected into one body of knowledge.</StaticBand>}
      <IntelligenceSection bridge="v2-last.jpg" />
      <RadarSection />
      {cinematic ? <VaultBlock /> : <StaticBand image="v4-last.jpg">Built to keep your engineering information inside your workspace.</StaticBand>}
      <SecuritySection bridge="v4-last.jpg" />
      <ConclusionSection />
    </main>
  </div>
}
