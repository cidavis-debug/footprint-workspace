import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, Icon, Input } from '@/design-system/footprint-0a8b1a'
import { WorkspaceTree } from '@/components/workspace-tree'
import { pathNames, type WsNode } from '@/lib/workspace-tree'

export type WorkspaceNode = WsNode

type Props = {
  workspaces: WorkspaceNode[]
  value: string
  onChange: (id: string) => void
  onCreate?: (name: string, parentId: string | null) => Promise<void>
  busy?: boolean
}

/** Compact workspace picker for narrow screens: the same three-level tree as the sidebar, in a dropdown. */
export function WorkspacePicker({ workspaces, value, onChange, onCreate, busy }: Props) {
  const [open, setOpen] = useState(false)
  const [newMain, setNewMain] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const names = pathNames(workspaces, value)
  const label = names.length ? names.join(' / ') : 'Workspace'

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const create = async () => {
    const trimmed = newMain.trim()
    if (!trimmed || !onCreate) return
    await onCreate(trimmed, null)
    setNewMain('')
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <Button variant="ghost" size="sm" aria-haspopup="true" aria-expanded={open} aria-label="Select workspace" onClick={() => setOpen(o => !o)}>
        <Icon name="Folder" /> <span className="ax-picker-label">{label}</span>
      </Button>
      {open && (
        <div className="ax-picker-panel absolute right-0 top-full z-50 mt-2 rounded-panel border bg-card p-2 shadow-floating">
          <WorkspaceTree workspaces={workspaces} value={value} onChange={id => { onChange(id); setOpen(false) }} {...(onCreate ? { onCreate } : {})} {...(busy !== undefined ? { busy } : {})} />
          {onCreate && <form className="mt-2 flex gap-1 border-t pt-2" onSubmit={e => { e.preventDefault(); void create() }}>
            <Input aria-label="New workspace name" placeholder="New workspace…" value={newMain} onChange={e => setNewMain(e.target.value)} />
            <Button type="submit" variant="quiet" size="sm" disabled={busy} aria-label="Create workspace"><Plus className="fp-icon" /></Button>
          </form>}
        </div>
      )}
    </div>
  )
}
