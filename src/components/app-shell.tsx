import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Icon, Input } from '@/design-system/footprint-0a8b1a'
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

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

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
    if (!flyout && !adding) return
    const close = () => { setFlyout(null); setAdding(false) }
    const onDoc = (e: MouseEvent) => { if (railRef.current && !railRef.current.contains(e.target as Node)) close() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [flyout, adding])

  const create = async (n: string, parentId: string | null, clear: () => void) => {
    if (!n.trim() || !onCreate) return
    await onCreate(n.trim(), parentId); clear(); setAdding(false); setFlyout(null)
  }
  const flyMain = mains.find(m => m.id === flyout)

  return <div className="app-shell">
    <nav ref={railRef} className="app-rail" aria-label="Workspaces">
      <Link to="/" className="app-rail-logo" aria-label="Footprint home"><Brand iconOnly /></Link>
      <ul className="app-rail-list">
        {mains.map(w => <li key={w.id}>
          <button type="button" className="app-rail-item" data-active={activeMain === w.id} aria-current={activeMain === w.id ? 'true' : undefined}
            aria-label={w.name} title={w.name} aria-expanded={flyout === w.id}
            onClick={() => { onChange(w.id); setAdding(false); setFlyout(f => f === w.id ? null : w.id) }}>
            {initial(w.name)}
          </button>
        </li>)}
      </ul>
      {onCreate && <button type="button" className="app-rail-item app-rail-add" aria-label="Add workspace" title="Add workspace" aria-expanded={adding} onClick={() => { setFlyout(null); setAdding(a => !a) }}><Icon name="Plus" /></button>}
      {flyMain && <div className="app-rail-flyout" role="menu" aria-label={`${flyMain.name} sub-workspaces`}>
        <p className="app-rail-flyout-title">{flyMain.name}</p>
        <ul className="flex flex-col gap-1">
          <li><button type="button" role="menuitemradio" aria-checked={value === flyMain.id} className="app-rail-sub" data-active={value === flyMain.id} onClick={() => { onChange(flyMain.id); setFlyout(null) }}>All of {flyMain.name}</button></li>
          {workspaces.filter(w => w.parent_id === flyMain.id).map(w => <li key={w.id}><button type="button" role="menuitemradio" aria-checked={value === w.id} className="app-rail-sub" data-active={value === w.id} onClick={() => { onChange(w.id); setFlyout(null) }}>{w.name}</button></li>)}
        </ul>
        {onCreate && <form className="mt-2 flex gap-1 border-t pt-2" onSubmit={e => { e.preventDefault(); void create(subName, flyMain.id, () => setSubName('')) }}>
          <Input aria-label="New sub-workspace name" placeholder="New sub-workspace…" value={subName} onChange={e => setSubName(e.target.value)} />
          <Button type="submit" variant="quiet" size="icon" disabled={busy} aria-label="Create sub-workspace" title="Create sub-workspace"><Icon name="Plus" /></Button>
        </form>}
      </div>}
      {adding && <form className="app-rail-flyout app-rail-flyout-bottom flex gap-1" onSubmit={e => { e.preventDefault(); void create(name, null, () => setName('')) }}>
        <Input aria-label="New workspace name" placeholder="New workspace…" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <Button type="submit" variant="quiet" size="icon" disabled={busy} aria-label="Create workspace" title="Create workspace"><Icon name="Plus" /></Button>
      </form>}
    </nav>
    <div className="app-body">
      <header className="app-header">
        <div className="app-mobile-workspaces"><WorkspacePicker workspaces={workspaces} value={value} onChange={onChange} {...(onCreate ? { onCreate } : {})} {...(busy !== undefined ? { busy } : {})} /></div>
        <span className="app-header-title">{title}</span>
        {onSources && <Button variant="quiet" size="sm" onClick={onSources}><Icon name="Folder" /> Sources</Button>}
        <span className="app-header-spacer" />
        {email && <span className="app-header-email">{email}</span>}
        {onSignOut && <Button variant="quiet" size="sm" onClick={onSignOut}>Log out</Button>}
      </header>
      <div className="app-mode" role="tablist" aria-label="Mode">
        <Link to="/app" search={value ? { workspace: value } : {}} role="tab" aria-selected={mode === 'ask'} className="app-mode-tab" data-active={mode === 'ask'}>Ask</Link>
        <Link to="/radar" search={value ? { workspace: value } : {}} role="tab" aria-selected={mode === 'radar'} className="app-mode-tab" data-active={mode === 'radar'}>Radar</Link>
      </div>
      {children}
    </div>
  </div>
}
