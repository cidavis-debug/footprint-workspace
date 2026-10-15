import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { COVER_MS, EntryTransitionProvider, NAV_TIMEOUT_MS, REVEAL_MS, useEntryTransition } from '@/ui/transition/entry-transition'
import { fake, routerState } from './support/fake-supabase'

vi.mock('@/integrations/supabase/client', async () => (await import('./support/fake-supabase')).supabaseModule)
vi.mock('@tanstack/react-router', async () => (await import('./support/fake-supabase')).routerModule)

function Trigger() {
  const { open, active } = useEntryTransition()
  return <button onClick={open} data-active={active}>Open Footprint</button>
}
const mount = () => render(<EntryTransitionProvider><Trigger /></EntryTransitionProvider>)
const overlay = () => document.querySelector('.fp-wl')
const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false, onchange: null })) as typeof window.matchMedia
}
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

beforeEach(() => {
  vi.useFakeTimers()
  fake.reset()
  routerState.navigate.mockReset().mockResolvedValue(undefined)
  routerState.preload.mockReset().mockResolvedValue(undefined)
  fake.auth.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
  setReducedMotion(false)
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('Open Footprint white light transition', () => {
  it('covers the screen, navigates signed-in users to /app, then reveals and cleans up', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Open Footprint' }))
    expect(overlay()?.getAttribute('data-phase')).toBe('cover')
    expect(routerState.navigate).not.toHaveBeenCalled()

    await advance(COVER_MS + 20)
    expect(routerState.navigate).toHaveBeenCalledWith({ to: '/app' })
    expect(routerState.preload).toHaveBeenCalledWith({ to: '/app' })
    // Overlay stays up through the route change, then fades.
    expect(overlay()).not.toBeNull()
    await advance(100)
    expect(overlay()?.getAttribute('data-phase')).toBe('reveal')
    await advance(REVEAL_MS + 20)
    expect(overlay()).toBeNull()
    expect(COVER_MS + REVEAL_MS).toBeLessThan(900)
  })

  it('sends signed-out users to the login flow with a safe /app redirect', async () => {
    fake.auth.getSession.mockResolvedValue({ data: { session: null } })
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Open Footprint' }))
    await advance(COVER_MS + 20)
    expect(routerState.navigate).toHaveBeenCalledWith({ to: '/login', search: { redirect: '/app' } })
    expect(routerState.preload).toHaveBeenCalledWith({ to: '/login' })
  })

  it('treats a failing session lookup as signed out', async () => {
    fake.auth.getSession.mockRejectedValue(new Error('offline'))
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Open Footprint' }))
    await advance(COVER_MS + 20)
    expect(routerState.navigate).toHaveBeenCalledWith({ to: '/login', search: { redirect: '/app' } })
  })

  it('ignores rapid repeated clicks while a transition is running', async () => {
    mount()
    const button = screen.getByRole('button', { name: 'Open Footprint' })
    fireEvent.click(button); fireEvent.click(button); fireEvent.click(button)
    await advance(COVER_MS + 20)
    expect(routerState.navigate).toHaveBeenCalledTimes(1)
    await advance(600)
    expect(overlay()).toBeNull()
    // And it can be used again afterwards.
    fireEvent.click(button)
    await advance(COVER_MS + 20)
    expect(routerState.navigate).toHaveBeenCalledTimes(2)
  })

  it('never traps the user behind the overlay when navigation hangs', async () => {
    routerState.navigate.mockReturnValue(new Promise(() => {}))
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Open Footprint' }))
    await advance(COVER_MS + 20)
    expect(overlay()).not.toBeNull()
    await advance(NAV_TIMEOUT_MS + 200)
    expect(overlay()?.getAttribute('data-phase')).toBe('reveal')
    await advance(REVEAL_MS + 50)
    expect(overlay()).toBeNull()
  })

  it('reveals the page even if navigation rejects', async () => {
    routerState.navigate.mockRejectedValue(new Error('chunk failed'))
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Open Footprint' }))
    await advance(COVER_MS + 200 + REVEAL_MS + 100)
    expect(overlay()).toBeNull()
  })

  it('cancels immediately on browser back/forward', async () => {
    routerState.navigate.mockReturnValue(new Promise(() => {}))
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Open Footprint' }))
    await advance(COVER_MS + 20)
    expect(overlay()).not.toBeNull()
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(overlay()).toBeNull()
  })

  it('navigates immediately without an overlay when reduced motion is preferred', async () => {
    setReducedMotion(true)
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Open Footprint' }))
    await advance(10)
    expect(overlay()).toBeNull()
    expect(routerState.navigate).toHaveBeenCalledWith({ to: '/app' })
  })
})
