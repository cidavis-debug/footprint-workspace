import { useNavigate, useRouter } from '@tanstack/react-router'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buttonVariants, type ButtonProps } from '@/design-system/footprint-0a8b1a'
import { supabase } from '@/integrations/supabase/client'
import './entry-transition.css'

/** Timings (ms). Total is roughly COVER + frame + REVEAL ≈ 850 when navigation is fast. */
export const COVER_MS = 480
export const REVEAL_MS = 340
/** Longest we wait on navigation before revealing anyway, and the absolute backstop. */
export const NAV_TIMEOUT_MS = 4000
export const FAILSAFE_MS = 8000

type Phase = 'idle' | 'cover' | 'hold' | 'reveal'

type EntryTransition = { open: () => void; active: boolean }

const fallback: EntryTransition = { open: () => { window.location.assign('/app') }, active: false }
const EntryTransitionContext = createContext<EntryTransition>(fallback)

export const useEntryTransition = () => useContext(EntryTransitionContext)

const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms))
const frames = (n: number) => new Promise<void>(resolve => {
  const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)))
  step(n)
})
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Mounted once at the app root so the overlay survives the route change.
 * Signed-in users go to /app; everyone else goes to the existing login flow, which returns them to /app.
 */
export function EntryTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const busy = useRef(false)
  const run = useRef(0)

  const open = useCallback(() => {
    if (busy.current) return
    busy.current = true
    const id = ++run.current
    const alive = () => run.current === id

    const decide = async () => {
      try { return !!(await supabase.auth.getSession()).data.session } catch { return false }
    }
    const go = (authed: boolean) => (authed ? navigate({ to: '/app' }) : navigate({ to: '/login', search: { redirect: '/app' } }))

    if (reducedMotion()) {
      void decide().then(go).catch(() => undefined).finally(() => { if (alive()) busy.current = false })
      return
    }

    setPhase('cover')
    let failsafe = 0
    const finish = () => {
      window.clearTimeout(failsafe)
      if (!alive()) return
      busy.current = false
      setPhase('idle')
    }
    failsafe = window.setTimeout(() => {
      if (!alive()) return
      setPhase('reveal')
      window.setTimeout(finish, REVEAL_MS)
    }, FAILSAFE_MS)

    void (async () => {
      const cover = sleep(COVER_MS)
      const authed = await decide()
      // Warm the destination while the light expands.
      void Promise.resolve(router.preloadRoute({ to: authed ? '/app' : '/login' })).catch(() => undefined)
      await cover
      if (!alive()) return
      setPhase('hold')
      await Promise.race([Promise.resolve(go(authed)).catch(() => undefined), sleep(NAV_TIMEOUT_MS)])
      await frames(2)
      if (!alive()) return
      setPhase('reveal')
      await sleep(REVEAL_MS)
      finish()
    })()
  }, [navigate, router])

  // Never trap the user: browser back/forward cancels an in-flight transition immediately.
  useEffect(() => {
    const cancel = () => {
      if (!busy.current) return
      run.current++
      busy.current = false
      setPhase('idle')
    }
    window.addEventListener('popstate', cancel)
    return () => window.removeEventListener('popstate', cancel)
  }, [])

  const value = useMemo<EntryTransition>(() => ({ open, active: phase !== 'idle' }), [open, phase])

  return <EntryTransitionContext.Provider value={value}>
    {children}
    {phase !== 'idle' && <div className="fp-wl" data-phase={phase} data-testid="entry-transition">
      <div className="fp-wl-light" aria-hidden="true" />
      <p className="fp-wl-sr" role="status">Opening Footprint</p>
    </div>}
  </EntryTransitionContext.Provider>
}

/** Button that opens Footprint with the transition; styled like the design-system button. */
export function EntryButton({ variant, size, className, children }: Pick<ButtonProps, 'variant' | 'size'> & { className?: string; children: ReactNode }) {
  const { open } = useEntryTransition()
  const classes = [buttonVariants({ variant, size }), className].filter(Boolean).join(' ')
  return <button type="button" className={classes} onClick={open}>{children}</button>
}

/** Text-link styled variant, used in footers. */
export function EntryLink({ className = 'site-link', children }: { className?: string; children: ReactNode }) {
  const { open } = useEntryTransition()
  return <button type="button" className={className} onClick={open} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}>{children}</button>
}
