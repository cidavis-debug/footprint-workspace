import { Link } from '@tanstack/react-router'
import { MessageSquare, PanelLeft, PanelRight, Plus, Radar } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Mark } from '@/components/landing/shared'
import { entryReady } from '@/components/app/entry'
import { WorkspacePicker, type WorkspaceNode } from '@/components/workspace-picker'
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

/** Authenticated frame: workspaces (glass, left), centre canvas, optional right panel, slate Ask/Radar switcher on top. */
export function AppShell({ workspaces, value, onChange, onCreate, busy, mode, email, onSources, onSignOut, right, rightOpen, onRightClose, rightCollapsed, onToggleRight, children }: Props) {
  const [leftCollapsed, setLeftCollapsed] = useState(() => { try { return localStorage.getItem('fp-left-collapsed') === '1' } catch { return false } })
  const toggleLeft = () => setLeftCollapsed(c => { const n = !c; try { localStorage.setItem('fp-left-collapsed', n ? '1' : '0') } catch { /* ignore */ } return n })
  const [adding, setAdding] = useState<string | 'root' | null>(null)
  const [name, setName] = useState('')
  const railRef = useRef<HTMLElement>(null)
  const mains = workspaces.filter(w => !w.parent_id)
  const search = value ? { workspace: value } : {}

  useEffect(() => { entryReady() }, [])
  useEffect(() => {
    if (!adding) return
    const onDoc = (e: MouseEvent) => { if (railRef.current && !railRef.current.contains(e.target as Node)) setAdding(null) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAdding(null) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [adding])

  const create = async (parentId: string | null) => {
    const n = name.trim()
    if (!n || !onCreate) return
    await onCreate(n, parentId); setName(''); setAdding(null)
  }
  const form = (parentId: string | null, label: string) => <form className="ax-newform" onSubmit={e => { e.preventDefault(); void create(parentId) }}>
    <input aria-label={label} placeholder={parentId ? 'New sub-workspace…' : 'New workspace…'} value={name} onChange={e => setName(e.target.value)} autoFocus />
    <button type="submit" disabled={busy || !name.trim()} aria-label={parentId ? 'Create sub-workspace' : 'Create workspace'}><Plus size={15} aria-hidden="true" /></button>
  </form>
  const initials = (email ?? '?').slice(0, 2).toUpperCase()

  return <div className={`ax ${right ? '' : 'ax-no-right'}`} data-mode={mode} data-lc={leftCollapsed} data-rc={!!rightCollapsed}>
    <div className="ax-glow" aria-hidden="true" />
    <header className="ax-top">
      <div className="ax-brandrow"><Link to="/" className="ax-brand" aria-label="Footprint AI home"><Mark size={18} /><span>Footprint AI</span></Link><button type="button" className="ax-iconbtn ax-left-toggle" onClick={toggleLeft} aria-expanded={!leftCollapsed} aria-controls="ax-left" aria-label={leftCollapsed ? 'Show workspaces' : 'Hide workspaces'} title={leftCollapsed ? 'Show workspaces' : 'Hide workspaces'}><PanelLeft size={18} aria-hidden="true" /></button></div>
      <nav className="ax-modes" data-mode={mode} aria-label="Mode">
        <i className="ax-modes-thumb" aria-hidden="true" />
        <Link to="/app" search={search} className="ax-mode" data-active={mode === 'ask'} aria-current={mode === 'ask' ? 'page' : undefined}><MessageSquare size={16} aria-hidden="true" /> Ask Mode</Link>
        <Link to="/radar" search={search} className="ax-mode" data-active={mode === 'radar'} aria-current={mode === 'radar' ? 'page' : undefined}><Radar size={16} aria-hidden="true" /> Radar Mode</Link>
      </nav>
      <div className="ax-account">
        <div className="ax-mobile-ws"><WorkspacePicker workspaces={workspaces} value={value} onChange={onChange} {...(onCreate ? { onCreate } : {})} {...(busy !== undefined ? { busy } : {})} /></div>
        {onSources && <button type="button" className="ax-iconbtn ax-sources-toggle" onClick={() => (window.matchMedia('(min-width: 1181px)').matches && onToggleRight ? onToggleRight() : onSources())} aria-expanded={!rightCollapsed} aria-label="Toggle sources" title="Toggle sources"><PanelRight size={18} aria-hidden="true" /></button>}
        {email && <span className="ax-avatar" title={email} aria-hidden="true">{initials}</span>}
        {email && <span className="ax-email">{email}</span>}
        {onSignOut && <button type="button" className="ax-signout" onClick={onSignOut}>Log out</button>}
      </div>
    </header>

    <nav ref={railRef} id="ax-left" className="ax-glass ax-left" aria-label="Workspaces" inert={leftCollapsed || undefined}>
      <div className="ax-panel-head"><h2>Workspaces</h2>{onCreate && <button type="button" className="ax-iconbtn" aria-label="Add workspace" aria-expanded={adding === 'root'} onClick={() => { setName(''); setAdding(a => a === 'root' ? null : 'root') }}><Plus size={16} aria-hidden="true" /></button>}</div>
      {adding === 'root' && form(null, 'New workspace name')}
      <ul className="ax-ws">
        {mains.map(w => <li key={w.id}>
          <div className="ax-ws-row">
            <button type="button" className="ax-ws-item" data-active={value === w.id} aria-current={value === w.id ? 'true' : undefined} onClick={() => onChange(w.id)}>{w.name}</button>
            {onCreate && <button type="button" className="ax-ws-add" aria-label={`Add sub-workspace to ${w.name}`} aria-expanded={adding === w.id} onClick={() => { setName(''); setAdding(a => a === w.id ? null : w.id) }}><Plus size={14} aria-hidden="true" /></button>}
          </div>
          <ul className="ax-subs">
            {workspaces.filter(k => k.parent_id === w.id).map(k => <li key={k.id}><button type="button" className="ax-ws-item ax-ws-sub" data-active={value === k.id} aria-current={value === k.id ? 'true' : undefined} onClick={() => onChange(k.id)}>{k.name}</button></li>)}
            {adding === w.id && <li>{form(w.id, `New sub-workspace in ${w.name}`)}</li>}
          </ul>
        </li>)}
      </ul>
      {mains.length === 0 && <p className="ax-empty">No workspace found for this account.</p>}
    </nav>

    <div className="ax-center">{children}</div>

    {right && <>
      <div className="ax-scrim" data-open={!!rightOpen} onClick={onRightClose} aria-hidden="true" />
      <div className="ax-right" data-open={!!rightOpen} inert={rightCollapsed || undefined}>{right}</div>
    </>}
  </div>
}
