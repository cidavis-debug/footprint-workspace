import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, MessageSquare, Plus, Radar } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Mark } from '@/components/landing/shared'
import { entryReady } from '@/components/app/entry'
import { WorkspacePicker, type WorkspaceNode } from '@/components/workspace-picker'
import { WorkspaceTree } from '@/components/workspace-tree'
import './app/app.css'
import './materials.css'

type Props = {
  workspaces: WorkspaceNode[]
  value: string
  onChange: (id: string) => void
  onCreate?: (name: string, parentId: string | null) => Promise<void>
  busy?: boolean
  mode: 'ask' | 'radar'
  email?: string | null
  onSources?: () => void
  onSignOut?: () => void
  /** Optional right-hand panel (Sources on /app). Radar passes none. */
  right?: ReactNode
  rightOpen?: boolean
  onRightClose?: () => void
  /** Desktop collapse state for the right panel (owned by the page so actions can re-expand it). */
  rightCollapsed?: boolean
  onToggleRight?: () => void
  children: ReactNode
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatches(m.matches)
    on(); m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return matches
}

/** Authenticated frame: workspaces (glass, left), centre canvas, optional right panel, slate Ask/Radar switcher on top. Both side panels collapse from tabs on the screen edges. */
export function AppShell({ workspaces, value, onChange, onCreate, busy, mode, email, onSources, onSignOut, right, rightOpen, onRightClose, rightCollapsed, onToggleRight, children }: Props) {
  const [leftCollapsed, setLeftCollapsed] = useState(() => { try { return localStorage.getItem('fp-left-collapsed') === '1' } catch { return false } })
  const toggleLeft = () => setLeftCollapsed(c => { const n = !c; try { localStorage.setItem('fp-left-collapsed', n ? '1' : '0') } catch { /* ignore */ } return n })
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const railRef = useRef<HTMLElement>(null)
  const wide = useMediaQuery('(min-width: 1181px)')
  const search = value ? { workspace: value } : {}
  // Wide screens collapse the Sources panel in place; narrower ones slide it over the page.
  const sourcesExpanded = wide ? !rightCollapsed : !!rightOpen
  const toggleSources = () => (wide && onToggleRight ? onToggleRight() : onSources?.())

  useEffect(() => { entryReady() }, [])
  useEffect(() => {
    if (!adding) return
    const onDoc = (e: MouseEvent) => { if (railRef.current && !railRef.current.contains(e.target as Node)) setAdding(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAdding(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [adding])

  const createTop = async () => {
    const n = name.trim()
    if (!n || !onCreate) return
    await onCreate(n, null); setName(''); setAdding(false)
  }
  const initials = (email ?? '?').slice(0, 2).toUpperCase()

  return <div className={`ax ${right ? '' : 'ax-no-right'}`} data-mode={mode} data-lc={leftCollapsed} data-rc={!!rightCollapsed}>
    <div className="ax-glow" aria-hidden="true" />
    <header className="ax-top">
      <div className="ax-brandrow"><Link to="/" className="ax-brand" aria-label="Footprint AI home"><Mark size={18} /><span>Footprint AI</span></Link></div>
      <nav className="ax-modes" data-mode={mode} aria-label="Mode">
        <i className="ax-modes-thumb" aria-hidden="true" />
        <Link to="/app" search={search} className="ax-mode" data-active={mode === 'ask'} aria-current={mode === 'ask' ? 'page' : undefined}><MessageSquare size={16} aria-hidden="true" /> Ask Mode</Link>
        <Link to="/radar" search={search} className="ax-mode" data-active={mode === 'radar'} aria-current={mode === 'radar' ? 'page' : undefined}><Radar size={16} aria-hidden="true" /> Radar Mode</Link>
      </nav>
      <div className="ax-account">
        <div className="ax-mobile-ws"><WorkspacePicker workspaces={workspaces} value={value} onChange={onChange} {...(onCreate ? { onCreate } : {})} {...(busy !== undefined ? { busy } : {})} /></div>
        {email && <span className="ax-avatar" title={email} aria-hidden="true">{initials}</span>}
        {email && <span className="ax-email">{email}</span>}
        {onSignOut && <button type="button" className="ax-signout" onClick={onSignOut}>Log out</button>}
      </div>
    </header>

    <nav ref={railRef} id="ax-left" className="ax-glass ax-left" aria-label="Workspaces" inert={leftCollapsed || undefined}>
      <div className="ax-panel-head"><h2>Workspaces</h2>{onCreate && <button type="button" className="ax-iconbtn" aria-label="Add workspace" aria-expanded={adding} onClick={() => { setName(''); setAdding(a => !a) }}><Plus size={16} aria-hidden="true" /></button>}</div>
      {adding && <form className="ax-newform" onSubmit={e => { e.preventDefault(); void createTop() }}>
        <input aria-label="New workspace name" placeholder="New workspace…" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <button type="submit" disabled={busy || !name.trim()} aria-label="Create workspace"><Plus size={15} aria-hidden="true" /></button>
      </form>}
      <WorkspaceTree workspaces={workspaces} value={value} onChange={onChange} {...(onCreate ? { onCreate } : {})} {...(busy !== undefined ? { busy } : {})} />
      {workspaces.length === 0 && <p className="ax-empty">No workspace found for this account.</p>}
    </nav>

    <div className="ax-center">{children}</div>

    {right && <>
      <div className="ax-scrim" data-open={!!rightOpen} onClick={onRightClose} aria-hidden="true" />
      <div className="ax-right" data-open={!!rightOpen} inert={rightCollapsed || undefined}>{right}</div>
    </>}

    <button type="button" className="ax-edge-tab" data-side="left" data-open={!leftCollapsed} aria-controls="ax-left" aria-expanded={!leftCollapsed} aria-label={leftCollapsed ? 'Show workspaces' : 'Hide workspaces'} title={leftCollapsed ? 'Show workspaces' : 'Hide workspaces'} onClick={toggleLeft}><ChevronLeft size={15} aria-hidden="true" /></button>
    {right && onSources && <button type="button" className="ax-edge-tab" data-side="right" data-open={sourcesExpanded} aria-expanded={sourcesExpanded} aria-label={sourcesExpanded ? 'Hide sources' : 'Show sources'} title={sourcesExpanded ? 'Hide sources' : 'Show sources'} onClick={toggleSources}><ChevronRight size={15} aria-hidden="true" /></button>}
  </div>
}
