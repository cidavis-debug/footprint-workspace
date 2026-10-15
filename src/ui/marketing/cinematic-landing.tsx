import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { openFootprint } from '@/ui/marketing/open-footprint'
import {
  HOLD_END, TRACK_VH, layerOpacity, parsePair, range, ss, textVisibility, videoIsNear, videoProgress,
  type LayerName, type VideoName,
} from '@/ui/marketing/timeline'
import './landing.css'

const A = '/landing'
const NAV = [
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/collections', label: 'Collections' },
  { to: '/security', label: 'Security' },
  { to: '/pricing', label: 'Pricing' },
] as const

/* ------------------------------------------------------------------ */
/* Animation attribute helper: data-* read by the scroll engine below. */
/* ------------------------------------------------------------------ */

type Spec = { in?: [number, number]; out?: [number, number]; from?: 'left' | 'right' | 'up' | 'none' }
const motion = (on: boolean, spec: Spec): Record<string, string> => {
  if (!on) return {}
  const attrs: Record<string, string> = { 'data-t': '', 'data-from': spec.from ?? 'none' }
  if (spec.in) attrs['data-in'] = spec.in.join(',')
  if (spec.out) attrs['data-out'] = spec.out.join(',')
  return attrs
}

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
      <button type="button" className="cin-cta" onClick={open}>Open Footprint <span aria-hidden="true">→</span></button>
      <button type="button" className="cin-menu-btn" aria-expanded={menu} aria-controls="cin-mobile-nav" onClick={() => setMenu(m => !m)}>{menu ? 'Close' : 'Menu'}</button>
    </div>
    {menu && <nav id="cin-mobile-nav" className="cin-mobile-nav" aria-label="Mobile navigation">
      {NAV.map(n => <Link key={n.to} to={n.to} className="cin-link" onClick={() => setMenu(false)}>{n.label}</Link>)}
      {account}
    </nav>}
  </header>
}

/* --------------------------- Scene content --------------------------- */

function HeroCopy({ on }: { on: boolean }) {
  return <div className="cin-sc cin-sc-hero">
    <h1 className="cin-display cin-hero-h" {...motion(on, { out: [0.7, 1.2], from: 'up' })}>Complex Engineering.<br />Connected Intelligence.</h1>
    <div className="cin-panel cin-hero-panel" {...motion(on, { in: [0.25, 0.6], out: [0.9, 1.3], from: 'right' })}>
      <p className="cin-mono cin-kicker">Engineering knowledge</p>
      <p>Footprint reads the drawings, specifications and reports behind every decision, and shows where they disagree.</p>
    </div>
    <div className="cin-scroll-hint" aria-hidden="true" {...motion(on, { out: [0.15, 0.4] })}><span className="cin-mono">Scroll</span><i /></div>
  </div>
}

function IngestCopy({ on }: { on: boolean }) {
  return <div className="cin-sc cin-sc-ingest">
    <ul className="cin-chips cin-mono" aria-label="Engineering information types" {...motion(on, { in: [4.0, 4.5], out: [4.8, 5.2], from: 'left' })}>
      <li>CAD</li><li>Reports</li><li>Requirements</li><li>Test Data</li>
    </ul>
    <h2 className="cin-display cin-h2 cin-ingest-h" {...motion(on, { in: [3.8, 4.3], out: [4.8, 5.2], from: 'up' })}>Your Tools. One Connected Intelligence.</h2>
    <p className="cin-lede cin-ingest-p" {...motion(on, { in: [4.1, 4.6], out: [4.8, 5.2], from: 'up' })}>Drawings, reports, requirements and test data come into one workspace, with every original close at hand.</p>
  </div>
}

function IntelCopy({ on }: { on: boolean }) {
  const out: [number, number] = [8.6, 9.0]
  return <div className="cin-sc cin-sc-intel">
    <div className="cin-intel-veil" aria-hidden="true" {...motion(on, { in: [6.9, 7.4], out, from: 'none' })} />
    <h2 className="cin-display cin-h2 cin-intel-h" {...motion(on, { in: [7.2, 7.8], out, from: 'up' })}>Find the Answers Hidden in Your Engineering Data.</h2>
    <div className="cin-intel-panels">
      <div className="cin-panel" {...motion(on, { in: [7.6, 8.0], out, from: 'right' })}><p className="cin-mono cin-kicker">01 / Ask</p><p>One question searches every document, drawing and report in your workspace.</p></div>
      <div className="cin-panel" {...motion(on, { in: [7.8, 8.2], out, from: 'right' })}><p className="cin-mono cin-kicker">02 / Cite</p><p>Each answer links back to the passages it came from.</p></div>
      <div className="cin-panel" {...motion(on, { in: [8.0, 8.4], out, from: 'right' })}><p className="cin-mono cin-kicker">03 / Structure</p><p>Interfaces, requirements and constraints are extracted and kept with their evidence.</p></div>
    </div>
  </div>
}

function Reticle() {
  return <svg viewBox="0 0 200 200" className="cin-reticle-svg" aria-hidden="true">
    <circle cx="100" cy="100" r="96" fill="none" stroke="#FF5E00" strokeWidth="1.4" />
    <circle cx="100" cy="100" r="78" fill="none" stroke="#F4F5F7" strokeOpacity=".35" strokeWidth=".8" strokeDasharray="2 5" />
    <circle cx="100" cy="100" r="44" fill="none" stroke="#FF5E00" strokeOpacity=".7" strokeWidth=".8" />
    <path d="M100 0v22M100 178v22M0 100h22M178 100h22" stroke="#FF5E00" strokeWidth="1.4" />
    <path d="M86 100h-10m48 0h10M100 86v-10m0 48v10" stroke="#F4F5F7" strokeWidth="1" />
    <path d="M30 40l8-8m132 8l-8-8M30 160l8 8m132-8l-8 8" stroke="#FF5E00" strokeOpacity=".6" strokeWidth="1" />
  </svg>
}

function ConflictCopy({ on }: { on: boolean }) {
  const out: [number, number] = [12.0, 12.4]
  return <div className="cin-sc cin-sc-conflict">
    <h2 className="cin-display cin-h2 cin-conflict-h" {...motion(on, { in: [9.2, 9.8], out, from: 'up' })}>Find the Conflicts. Follow the Evidence.</h2>
    <div className="cin-reticle" {...motion(on, { in: [10.4, 10.9], out })} {...(on ? { 'data-scale': '10.4,11.2', 'data-scale-from': '0.35' } : {})}>
      <Reticle />
      <span className="cin-mono cin-delta">Δ 2 mm</span>
    </div>
    {on && <div className="cin-flash" data-pulse="11.1,11.3,11.8" data-peak="0.5" aria-hidden="true" />}
    <div className="cin-status" role="status" {...motion(on, { in: [11.3, 11.7], out, from: 'up' })}>
      <p className="cin-mono cin-alert">Potential Conflict — Review Required</p>
      <p className="cin-note">Two sources disagree on the same dimension. Footprint does not decide which is correct.</p>
    </div>
    <div className="cin-panel cin-source cin-source-a" {...motion(on, { in: [10.0, 10.6], out, from: 'left' })}>
      <p className="cin-mono cin-kicker">Source A</p>
      <p className="cin-source-name">Interface Drawing</p>
      <p className="cin-source-value cin-mono">Mounting bore Ø <b>8 mm</b></p>
    </div>
    <div className="cin-panel cin-source cin-source-b" {...motion(on, { in: [10.2, 10.8], out, from: 'right' })}>
      <p className="cin-mono cin-kicker">Source B</p>
      <p className="cin-source-name">Assembly Specification</p>
      <p className="cin-source-value cin-mono">Mounting bore Ø <b>10 mm</b></p>
    </div>
  </div>
}

function SecurityCopy({ on }: { on: boolean }) {
  return <div className="cin-sc cin-sc-security">
    <div className="cin-panel cin-security-panel" {...motion(on, { in: [14.6, 15.2], from: 'left' })}>
      <p className="cin-mono cin-kicker">Security</p>
      <h2 className="cin-display cin-h2">Intelligence Without Compromise.</h2>
      <p>Your sources stay inside your workspace. Access is limited to its members, and original files are held in private storage.</p>
    </div>
  </div>
}

function Footer({ on }: { on: boolean }) {
  return <footer className="cin-footer" {...motion(on, { in: [15.8, 16.3], from: 'up' })}>
    <Link to="/" className="cin-brand"><span className="cin-slash" aria-hidden="true" />Footprint</Link>
    <nav aria-label="Footer navigation">{NAV.map(n => <Link key={n.to} to={n.to} className="cin-link">{n.label}</Link>)}</nav>
  </footer>
}

/* ------------------------- Cinematic engine -------------------------- */

const FALLBACK_DURATION: Record<VideoName, number> = { v1: 6.08, v2: 6.08, v3: 3.17, v4: 5.125 }

function useScrollTimeline(track: React.RefObject<HTMLDivElement | null>, stage: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const trackEl = track.current, stageEl = stage.current
    if (!trackEl || !stageEl) return
    const layers = [...stageEl.querySelectorAll<HTMLElement>('[data-layer]')]
    const texts = [...stageEl.querySelectorAll<HTMLElement>('[data-t]')]
    let raf = 0
    let lastU = Number.NaN
    let pending = false

    const apply = (u: number) => {
      pending = false
      for (const el of layers) {
        const name = el.dataset['layer'] as LayerName
        const o = layerOpacity(name, u)
        el.style.opacity = o.toFixed(3)
        el.style.visibility = o < 0.005 ? 'hidden' : 'visible'
        if (name === 'v4') el.style.transform = `scale(${(1 - 0.1 * ss(u, 15.2, 16.4)).toFixed(4)})`
        if (el instanceof HTMLVideoElement && name !== 'hero' && name !== 's2' && videoIsNear(name, u)) {
          const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : FALLBACK_DURATION[name]
          const target = Math.min(dur - 0.02, videoProgress(name, u) * dur)
          const gap = Math.abs(el.currentTime - target)
          if (gap > 1 / 60) {
            pending = true
            if (!el.seeking) {
              if (gap > 0.6 && 'fastSeek' in el) el.fastSeek(target)
              else el.currentTime = target
            }
          }
        }
      }
      for (const el of texts) {
        const d = el.dataset
        const inR = parsePair(d['in']), outR = parsePair(d['out'])
        const { entered, exited, visible } = textVisibility({ ...(inR ? { in: inR } : {}), ...(outR ? { out: outR } : {}) }, u)
        const pulse = d['pulse']?.split(',').map(Number)
        let opacity = visible
        if (pulse && pulse.length === 3) {
          const [a = 0, b = 0, c = 0] = pulse
          opacity = (u < b ? range(u, a, b) : 1 - range(u, b, c)) * Number(d['peak'] ?? 1)
        }
        const from = d['from']
        const x = from === 'left' ? -(1 - entered) * 64 : from === 'right' ? (1 - entered) * 64 : 0
        const y = from === 'up' ? (1 - entered) * 26 - exited * 16 : 0
        const sc = parsePair(d['scale'])
        const scaleFrom = Number(d['scaleFrom'] ?? 1)
        const s = sc ? scaleFrom + (1 - scaleFrom) * ss(u, sc[0], sc[1]) : 1
        el.style.opacity = opacity.toFixed(3)
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)${sc ? ` scale(${s.toFixed(3)})` : ''}`
        el.style.pointerEvents = visible < 0.05 ? 'none' : ''
      }
    }

    const tick = () => {
      const u = Math.min(HOLD_END + 1, Math.max(0, -trackEl.getBoundingClientRect().top / window.innerHeight))
      if (u !== lastU || pending) { lastU = u; apply(u) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [track, stage])
}

function CinematicStage() {
  const track = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  useScrollTimeline(track, stage)
  const video = (name: VideoName, extra?: CSSProperties) =>
    <video data-layer={name} className="cin-fill" src={`${A}/${name}.mp4`} poster={`${A}/${name}-first.jpg`} muted playsInline preload="auto" disablePictureInPicture tabIndex={-1} aria-hidden="true" style={extra} />
  return <div ref={track} className="cin-track" style={{ height: `${TRACK_VH * 100}vh` }}>
    <div ref={stage} className="cin-stage">
      <div className="cin-frame" aria-hidden="true">
        {video('v1')}
        <img data-layer="hero" className="cin-fill cin-hero-img" src={`${A}/hero.jpg`} alt="" />
        <div data-layer="s2" className="cin-fill" style={{ opacity: 0 }}><img className="cin-fill cin-s2-img" src={`${A}/ingestion.jpg`} alt="" /><i className="cin-s2-patch" /></div>
        {video('v2', { opacity: 0 })}
        {video('v3', { opacity: 0 })}
        {video('v4', { opacity: 0 })}
        <div className="cin-vignette" />
      </div>
      <HeroCopy on />
      <IngestCopy on />
      <IntelCopy on />
      <ConflictCopy on />
      <SecurityCopy on />
      <Footer on />
    </div>
  </div>
}

/* ----------------- Static layout (mobile / reduced motion) ----------------- */

function StaticScenes() {
  const scene = (img: string, cls: string, children: ReactNode, label: string) =>
    <section className={`cin-static-scene ${cls}`} aria-label={label}>
      <img className="cin-static-bg" src={`${A}/${img}`} alt="" loading={cls === 'is-hero' ? 'eager' : 'lazy'} />
      <div className="cin-static-shade" aria-hidden="true" />
      {children}
    </section>
  return <main className="cin-static">
    {scene('hero.jpg', 'is-hero', <HeroCopy on={false} />, 'Introduction')}
    {scene('ingestion.jpg', 'is-ingest', <IngestCopy on={false} />, 'Information ingestion')}
    {scene('v2-last.jpg', 'is-intel', <IntelCopy on={false} />, 'Connected intelligence')}
    {scene('v3-last.jpg', 'is-conflict', <ConflictCopy on={false} />, 'Engineering change radar')}
    {scene('v4-last.jpg', 'is-security', <><SecurityCopy on={false} /><Footer on={false} /></>, 'Security')}
  </main>
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
  // The page is dark from the first paint; browsers without the cinematic mode get the static scenes.
  return <div className="cin" data-mode={cinematic ? 'cinematic' : 'static'}>
    <Header />
    {cinematic ? <main><CinematicStage /></main> : <StaticScenes />}
  </div>
}
