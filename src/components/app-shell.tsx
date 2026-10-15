import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Input } from '@/design-system/apple-inspired-bec754'
import { ChevronDown, Folder, Plus } from 'lucide-react'
import { Brand } from '@/components/brand'
import { WorkspacePicker, type WorkspaceNode } from '@/components/workspace-picker'

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
  children: ReactNode
}


/** Authenticated app frame: workspace rail (desktop), utility header, and Ask/Radar switch. */
export function AppShell({ workspaces, value, onChange, onCreate, busy, mode, email, onSources, onSignOut, children }: Props) {
  const [flyout, setFlyout] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [subName, setSubName] = useState('')
  const railRef = useRef<HTMLElement>(null)
  const mains = workspaces.filter(w => !w.parent_id)
  const active = workspaces.find(w => w.id === value)
  const activeMain = active?.parent_id ?? active?.id
  const parent = active?.parent_id ? workspaces.find(w => w.id === active.parent_id) : null
  const title = active ? (parent ? `${parent.name} / ${active.name}` : active.name) : 'Workspace'

  useEffect(() => {
    if (!adding) return
    const close = () => setAdding(false)
    const onDoc = (e: MouseEvent) => { if (railRef.current && !railRef.current.contains(e.target as Node)) close() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [adding])

  const create = async (n: string, parentId: string | null, clear: () => void) => {
    if (!n.trim() || !onCreate) return
    await onCreate(n.trim(), parentId); clear(); setAdding(false)
  }

  return <div className="app-shell">
    <nav ref={railRef} className="app-rail" aria-label="Workspaces">
      <Link to="/" className="app-rail-logo" aria-label="Footprint home"><Brand iconOnly /></Link>
      <ul className="app-rail-list">
        {mains.map(w => { const kids = workspaces.filter(k => k.parent_id === w.id); const open = flyout === w.id || activeMain === w.id; return <li key={w.id}>
          <div className="app-rail-row">
            <button type="button" className="app-rail-item" data-active={value === w.id} aria-current={value === w.id ? 'true' : undefined} onClick={() => onChange(w.id)}>{w.name}</button>
            <button type="button" className="app-rail-toggle" aria-label={`${open ? 'Collapse' : 'Expand'} ${w.name}`} aria-expanded={open} onClick={() => setFlyout(f => f === w.id ? null : w.id)}>{open ? <ChevronDown className="fp-icon" aria-hidden="true" /> : <ChevronRight className="fp-icon" />}</button>
          </div>
          {open && <ul className="app-rail-subs">
            {kids.map(k => <li key={k.id}><button type="button" className="app-rail-sub" data-active={value === k.id} aria-current={value === k.id ? 'true' : undefined} onClick={() => onChange(k.id)}>{k.name}</button></li>)}
            {onCreate && <li><form className="flex gap-1" onSubmit={e => { e.preventDefault(); void create(subName, w.id, () => setSubName('')) }}>
              <Input aria-label={`New sub-workspace in ${w.name}`} placeholder="New sub-workspace…" value={subName} onChange={e => setSubName(e.target.value)} />
              <Button type="submit" variant="ghost" size="icon" disabled={busy} aria-label="Create sub-workspace" title="Create sub-workspace"><Plus className="fp-icon" aria-hidden="true" /></Button>
            </form></li>}
          </ul>}
        </li> })}
      </ul>
      {onCreate && <Button variant="ghost" size="sm" aria-expanded={adding} onClick={() => setAdding(a => !a)}><Plus className="fp-icon" aria-hidden="true" /> Add workspace</Button>}
      {adding && <form className="app-rail-flyout app-rail-flyout-bottom flex gap-1" onSubmit={e => { e.preventDefault(); void create(name, null, () => setName('')) }}>
        <Input aria-label="New workspace name" placeholder="New workspace…" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <Button type="submit" variant="ghost" size="icon" disabled={busy} aria-label="Create workspace" title="Create workspace"><Plus className="fp-icon" aria-hidden="true" /></Button>
      </form>}
    </nav>
    <div className="app-body">
      <header className="app-header">
        <div className="app-mobile-workspaces"><WorkspacePicker workspaces={workspaces} value={value} onChange={onChange} {...(onCreate ? { onCreate } : {})} {...(busy !== undefined ? { busy } : {})} /></div>
        <span className="app-header-title">{title}</span>
        {onSources && <Button variant="ghost" size="sm" onClick={onSources}><Folder className="fp-icon" aria-hidden="true" /> Sources</Button>}
        <span className="app-header-spacer" />
        {email && <span className="app-header-email">{email}</span>}
        {onSignOut && <Button variant="ghost" size="sm" onClick={onSignOut}>Log out</Button>}
      </header>
      <div className="app-mode" role="tablist" aria-label="Mode">
        <Link to="/app" search={value ? { workspace: value } : {}} role="tab" aria-selected={mode === 'ask'} className="app-mode-tab" data-active={mode === 'ask'}>Ask</Link>
        <Link to="/radar" search={value ? { workspace: value } : {}} role="tab" aria-selected={mode === 'radar'} className="app-mode-tab" data-active={mode === 'radar'}>Radar</Link>
      </div>
      {children}
    </div>
  </div>
}
