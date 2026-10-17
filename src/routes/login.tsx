import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { Button, Icon, Input } from '@/design-system/footprint-0a8b1a'
import { SiteLayout } from '@/components/site-layout'
import { pageHead } from '@/components/page-head'
import { supabase } from '@/integrations/supabase/client'
import { safeRedirect, useAuth } from '@/hooks/use-auth'

/** Requires the Google provider to be enabled in Supabase (Authentication > Sign In / Providers). */
const GOOGLE_ENABLED = true

export const Route = createFileRoute('/login')({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s['redirect'] === 'string' ? { redirect: s['redirect'] } : {}),
  head: () => pageHead('Log in — Footprint AI', 'Sign in or create your Footprint AI account.'),
  component: Login,
})

function Login() {
  const { redirect } = Route.useSearch()
  const target = safeRedirect(redirect)
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => { if (!loading && user) navigate({ to: target }) }, [user, loading, target, navigate])

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setInfo('')
    const res = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(target)}` } })
    setBusy(false)
    if (res.error) return setError(res.error.message)
    if (mode === 'signup' && !res.data.session) setInfo('Check your email to confirm your account, then sign in.')
  }

  async function google() {
    setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(target)}` } })
    if (err) setError(err.message)
  }

  return <SiteLayout><main className="site-width"><section className="simple-page">
    <p className="section-kicker">Your Footprint AI account</p>
    <h1>{mode === 'signin' ? 'Welcome back.' : 'Create your account.'}</h1>
    <form onSubmit={submit} className="flex flex-col gap-4 mt-6">
      <label className="flex flex-col gap-2"><span>Email</span><Input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="flex flex-col gap-2"><span>Password</span><Input type="password" required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {info && <p role="status">{info}</p>}
      <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Log in' : 'Sign up'}</Button>
      {GOOGLE_ENABLED && <Button type="button" variant="secondary" onClick={google}>Continue with Google</Button>}
      <Button type="button" variant="quiet" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}>
        {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Log in'}
      </Button>
    </form>
  </section></main></SiteLayout>
}
