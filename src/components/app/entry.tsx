import { useSyncExternalStore } from 'react'
import './entry.css'

/**
 * Persistent route-change overlay for "Open Footprint": a gray disc grows from the viewport centre until it
 * covers the screen, the route changes underneath, then the overlay fades once the app reports it is ready.
 */
type Phase = 'idle' | 'expand' | 'hold' | 'fade'

let phase: Phase = 'idle'
let ready = false
const subs = new Set<() => void>()
const set = (p: Phase) => { phase = p; subs.forEach(f => f()) }
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function maybeFade() {
  if (phase === 'hold' && ready) { set('fade'); window.setTimeout(() => set('idle'), 320) }
}

export function startEntry(navigate: () => void) {
  if (reduced() || phase !== 'idle') { navigate(); return }
  ready = false
  set('expand')
  window.setTimeout(navigate, 380)
  window.setTimeout(() => { set('hold'); maybeFade() }, 420)
  // Never trap the user behind the overlay if the next route is slow or redirects.
  window.setTimeout(() => { ready = true; maybeFade() }, 1700)
}

/** Called by the destination once its frame is on screen. */
export function entryReady() { ready = true; maybeFade() }

export function EntryOverlay() {
  const p = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => phase, () => 'idle' as Phase)
  return <div className="entry" data-phase={p} aria-hidden="true" />
}
