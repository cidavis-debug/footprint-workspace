import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Badge, Button } from '@/design-system/apple-inspired-bec754'
import { ArrowUpRight, MoreHorizontal, X } from 'lucide-react'
import { NavigationButton } from '@/components/navigation-button'
import { Brand } from '@/components/brand'
import { useAuth } from '@/hooks/use-auth'

const directory = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/collections', label: 'Collections' },
  { to: '/security', label: 'Security' },
  { to: '/pricing', label: 'Pricing' },
] as const

export function SiteLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, loading, signOut } = useAuth()
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButton.current?.focus()
    }
    document.addEventListener('keydown', dismiss)
    return () => document.removeEventListener('keydown', dismiss)
  }, [menuOpen])
  function closeMenu() { setMenuOpen(false); menuButton.current?.focus() }
  return <>
    <header className="floating-header" onKeyDown={event => { if (event.key === 'Escape') closeMenu() }}>
      <div className="top-scroll-fade" aria-hidden="true" />
      <div className="site-width">
      <div className="site-header">
        <Link to="/" className="wordmark" aria-label="Footprint home"><Brand iconOnly /></Link>
        <nav aria-label="Main navigation" className="site-nav">
          {directory.map(item => <Link key={item.to} to={item.to} className="site-link" activeProps={{ 'aria-current': 'page' }}>{item.label}</Link>)}
        </nav>
        <div className="account-actions">
          {!loading && (user
            ? <span className="desktop-account flex items-center gap-2"><Badge variant="neutral" aria-label={user.email ?? 'Account'} title={user.email ?? ''}>{(user.email?.[0] ?? '?').toUpperCase()}</Badge><Button variant="ghost" onClick={signOut}>Log out</Button></span>
            : <Link to="/login" className="site-link desktop-account">Log in</Link>)}
          <NavigationButton to="/app"><span className="desktop-open-label">Open Footprint</span><span className="compact-open-label">Open</span><ArrowUpRight className="fp-icon" aria-hidden="true" /></NavigationButton>
          <Button ref={menuButton} variant="ghost" size="icon" className="mobile-menu-trigger" aria-label={menuOpen ? 'Close menu' : 'Open menu'} title={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X className="fp-icon" aria-hidden="true" /> : <MoreHorizontal className="fp-icon" aria-hidden="true" />}</Button>
        </div>
      </div>
      {menuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="mobile-menu" onKeyDown={e => { if (e.key === 'Escape') closeMenu() }}>
        <Link to="/" className="wordmark" aria-label="Footprint home" onClick={closeMenu}><Brand iconOnly /></Link>
        {directory.map(item => <Link key={item.to} to={item.to} className="site-link" activeProps={{ 'aria-current': 'page' }} onClick={closeMenu}>{item.label}</Link>)}
        {!loading && (user
          ? <Button variant="ghost" onClick={() => { closeMenu(); void signOut() }}>Log out</Button>
          : <Link to="/login" className="site-link" onClick={closeMenu}>Log in</Link>)}
      </nav>}
      </div>
    </header>
    <div className="site-content">
    {children}
    <footer className="site-width"><div className="site-footer">
      <Link to="/" className="wordmark"><Brand /></Link>
      <span className="demo-label">A little more clarity. A lot less searching.</span>
      <nav aria-label="Footer navigation" className="footer-links">{directory.map(item => <Link key={item.to} to={item.to} className="site-link">{item.label}</Link>)}<Link to="/app" className="site-link">Open Footprint <span aria-hidden="true">↗</span></Link></nav>
    </div></footer>
    </div>
  </>
}