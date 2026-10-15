import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { safeRedirect } from '@/hooks/use-auth'
import { authState, fake, routerState } from './support/fake-supabase'

vi.mock('@/integrations/supabase/client', async () => (await import('./support/fake-supabase')).supabaseModule)
vi.mock('@tanstack/react-router', async () => (await import('./support/fake-supabase')).routerModule)
vi.mock('@/hooks/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-auth')>('@/hooks/use-auth')
  const { authState: state } = await import('./support/fake-supabase')
  return { ...actual, useAuth: () => state }
})
vi.mock('@/components/site-layout', () => ({ SiteLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

type RouteModule = { Route: unknown }
const component = (m: RouteModule) => (m.Route as { component: () => React.JSX.Element }).component

beforeEach(() => {
  fake.reset()
  authState.user = null
  authState.loading = false
  routerState.search = {}
  routerState.navigate.mockReset()
})
afterEach(cleanup)

describe('safeRedirect', () => {
  it('allows same-origin absolute paths', () => {
    expect(safeRedirect('/radar?workspace=abc')).toBe('/radar?workspace=abc')
    expect(safeRedirect('/app')).toBe('/app')
  })
  it('falls back to /app for anything that could leave the site', () => {
    for (const bad of ['//evil.example', 'https://evil.example', 'javascript:alert(1)', 'app', '', undefined, null, 42]) {
      expect(safeRedirect(bad)).toBe('/app')
    }
  })
})

describe('authenticated layout guard', () => {
  type BeforeLoad = (ctx: { location: { href: string } }) => Promise<unknown>
  const guard = async () => ((await import('@/routes/_authenticated/route')).Route as unknown as { beforeLoad: BeforeLoad }).beforeLoad

  it('redirects visitors without a session to /login with the original location', async () => {
    fake.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const beforeLoad = await guard()
    await expect(beforeLoad({ location: { href: '/radar?workspace=w1' } })).rejects.toEqual({
      redirected: { to: '/login', search: { redirect: '/radar?workspace=w1' } },
    })
  })

  it('redirects when the session cannot be verified', async () => {
    fake.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: { message: 'expired' } })
    const beforeLoad = await guard()
    await expect(beforeLoad({ location: { href: '/radar' } })).rejects.toMatchObject({ redirected: { to: '/login' } })
  })

  it('exposes the user id to child routes when signed in', async () => {
    fake.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const beforeLoad = await guard()
    await expect(beforeLoad({ location: { href: '/radar' } })).resolves.toEqual({ radarUserId: 'u1' })
  })
})

describe('login page', () => {
  const renderLogin = async () => {
    const Login = component(await import('@/routes/login'))
    return render(<Login />)
  }
  const fill = (email: string, password: string) => {
    fireEvent.change(document.querySelector('input[type=email]')!, { target: { value: email } })
    fireEvent.change(document.querySelector('input[type=password]')!, { target: { value: password } })
  }

  it('signs in with email and password', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    await renderLogin()
    fill('ada@example.com', 'secret1')
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(fake.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'secret1' }))
  })

  it('shows the provider error when sign-in fails', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } })
    await renderLogin()
    fill('ada@example.com', 'wrong')
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Invalid login credentials')
  })

  it('signs up with a confirmation redirect back to the requested page', async () => {
    routerState.search = { redirect: '/radar' }
    fake.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
    await renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /Create an account/ }))
    fill('new@example.com', 'secret1')
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    await screen.findByText('Check your email to confirm your account, then sign in.')
    expect(fake.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret1',
      options: { emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent('/radar')}` },
    })
  })

  it('sends an already signed-in user to the requested page', async () => {
    authState.user = { id: 'u1', email: 'ada@example.com' }
    routerState.search = { redirect: '/radar?workspace=w1' }
    await renderLogin()
    await waitFor(() => expect(routerState.navigate).toHaveBeenCalledWith({ to: '/radar?workspace=w1' }))
  })

  it('refuses off-site redirect targets after sign-in', async () => {
    authState.user = { id: 'u1', email: 'ada@example.com' }
    routerState.search = { redirect: '//evil.example' }
    await renderLogin()
    await waitFor(() => expect(routerState.navigate).toHaveBeenCalledWith({ to: '/app' }))
  })

  it('does not redirect while the session is still loading', async () => {
    authState.user = { id: 'u1', email: 'ada@example.com' }
    authState.loading = true
    await renderLogin()
    expect(routerState.navigate).not.toHaveBeenCalled()
  })
})
