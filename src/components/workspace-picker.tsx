import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { Button, Icon, Input } from '@/design-system/footprint-0a8b1a'

export type WorkspaceNode = { id: string; name: string; parent_id: string | null }

type Props = {
  workspaces: WorkspaceNode[]
  value: string
  onChange: (id: string) => void
  onCreate?: (name: string, parentId: string | null) => Promise<void>
  busy?: boolean
}

/** Cascading workspace picker: main workspaces on the left, sub-workspaces in an adjacent panel. */
export function WorkspacePicker({ workspaces, value, onChange, onCreate, busy }: Props) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newMain, setNewMain] = useState('')
  const [newSub, setNewSub] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const mains = workspaces.filter(w => !w.parent_id)
  const subs = (id: string) => workspaces.filter(w => w.parent_id === id)
  const active = workspaces.find(w => w.id === value)
  const activeParent = active?.parent_id ? workspaces.find(w => w.id === active.parent_id) : null
  const label = active ? (activeParent ? `${activeParent.name} / ${active.name}` : active.name) : 'Workspace'

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const pick = (id: string) => { onChange(id); setOpen(false) }
  const create = async (name: string, parentId: string | null, clear: () => void) => {
    const trimmed = name.trim()
    if (!trimmed || !onCreate) return
    await onCreate(trimmed, parentId)
    clear()
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <Button variant="ghost" size="sm" aria-haspopup="true" aria-expanded={open} aria-label="Select workspace" onClick={() => setOpen(o => !o)}>
        <Icon name="Folder" /> {label}
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 flex gap-2">
          <div className="w-max min-w-8 rounded-panel border bg-card p-2 shadow-floating" role="menu" aria-label="Workspaces">
            <ul className="flex flex-col gap-1">
              {mains.map(w => (
                <li key={w.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={value === w.id}
                    onClick={() => pick(w.id)}
                    className={`fp-control flex-1 rounded-button px-3 text-left text-sm ${value === w.id ? 'bg-accent text-foreground' : 'text-foreground'}`}
                  >
                    {w.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Sub-workspaces of ${w.name}`}
                    aria-expanded={expanded === w.id}
                    onClick={() => setExpanded(e => (e === w.id ? null : w.id))}
                    className="fp-control rounded-button px-2 text-muted-foreground"
                  >
                    <ChevronRight className="fp-icon" />
                  </button>
                </li>
              ))}
            </ul>
            {onCreate && <form className="mt-2 flex gap-1 border-t pt-2" onSubmit={e => { e.preventDefault(); void create(newMain, null, () => setNewMain('')) }}>
              <Input aria-label="New workspace name" placeholder="New workspace…" value={newMain} onChange={e => setNewMain(e.target.value)} />
              <Button type="submit" variant="quiet" size="sm" disabled={busy} aria-label="Create workspace"><Plus className="fp-icon" /></Button>
            </form>}
          </div>
          {expanded && (
            <div className="w-max min-w-8 rounded-panel border bg-card p-2 shadow-floating" role="menu" aria-label={`Sub-workspaces of ${mains.find(w => w.id === expanded)?.name ?? ''}`}>
              <ul className="flex flex-col gap-1">
                {subs(expanded).length > 0 ? subs(expanded).map(w => (
                  <li key={w.id}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={value === w.id}
                      onClick={() => pick(w.id)}
                      className={`fp-control w-full rounded-button px-3 text-left text-sm ${value === w.id ? 'bg-accent text-foreground' : 'text-foreground'}`}
                    >
                      {w.name}
                    </button>
                  </li>
                )) : <li className="px-3 py-2 text-caption text-muted-foreground">No sub-workspaces yet.</li>}
              </ul>
              {onCreate && <form className="mt-2 flex gap-1 border-t pt-2" onSubmit={e => { e.preventDefault(); void create(newSub, expanded, () => setNewSub('')) }}>
                <Input aria-label="New sub-workspace name" placeholder="New sub-workspace…" value={newSub} onChange={e => setNewSub(e.target.value)} />
                <Button type="submit" variant="quiet" size="sm" disabled={busy} aria-label="Create sub-workspace"><Plus className="fp-icon" /></Button>
              </form>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
