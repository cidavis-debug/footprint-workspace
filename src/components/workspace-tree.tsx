import { ChevronRight, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ancestorIds, buildTree, LEVEL_NAMES, MAX_WORKSPACE_DEPTH, type TreeNode, type WsNode } from '@/lib/workspace-tree'

type Props = {
  workspaces: WsNode[]
  value: string
  onChange: (id: string) => void
  onCreate?: (name: string, parentId: string | null) => Promise<void>
  busy?: boolean
}

const STORE = 'fp-ws-expanded'
const readExpanded = (): Set<string> => {
  try { const raw = JSON.parse(localStorage.getItem(STORE) ?? '[]'); return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []) } catch { return new Set() }
}

/** Expandable tree of workspaces, up to three levels deep. Each branch opens and closes on its own; the active workspace's branch is always revealed. */
export function WorkspaceTree({ workspaces, value, onChange, onCreate, busy }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(readExpanded)
  const [adding, setAdding] = useState<string | null>(null)
  const [name, setName] = useState('')
  const rootRef = useRef<HTMLUListElement>(null)
  const tree = useMemo(() => buildTree(workspaces), [workspaces])

  const remember = (next: Set<string>) => { try { localStorage.setItem(STORE, JSON.stringify([...next])) } catch { /* ignore */ } return next }
  const open = (ids: string[]) => setExpanded(cur => ids.every(i => cur.has(i)) ? cur : remember(new Set([...cur, ...ids])))
  const toggle = (id: string) => setExpanded(cur => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return remember(next) })

  // Keep the active workspace visible: open every ancestor when it changes (switching, creating, deep links).
  useEffect(() => { if (value) open(ancestorIds(workspaces, value)) }, [value, workspaces]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!adding) return
    const onDoc = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setAdding(null) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAdding(null) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [adding])

  const submit = async (parentId: string) => {
    const trimmed = name.trim()
    if (!trimmed || !onCreate) return
    await onCreate(trimmed, parentId)
    open([parentId]); setName(''); setAdding(null)
  }

  const renderNode = (n: TreeNode): ReactNode => {
    const hasKids = n.children.length > 0
    const isOpen = expanded.has(n.id)
    const canAdd = !!onCreate && n.depth < MAX_WORKSPACE_DEPTH
    const childLevel = LEVEL_NAMES[n.depth] ?? 'workspace'
    return <li key={n.id} role="treeitem" aria-level={n.depth} aria-selected={value === n.id} aria-expanded={hasKids ? isOpen : undefined} className="ax-ws-node">
      <div className="ax-ws-row" data-depth={n.depth}>
        {hasKids
          ? <button type="button" className="ax-ws-chev" data-open={isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${n.name}`} aria-expanded={isOpen} onClick={() => toggle(n.id)}><ChevronRight size={14} aria-hidden="true" /></button>
          : <span className="ax-ws-chev ax-ws-chev-space" aria-hidden="true" />}
        <button type="button" className="ax-ws-item" data-active={value === n.id} aria-current={value === n.id ? 'true' : undefined} onClick={() => onChange(n.id)}>{n.name}</button>
        {canAdd && <button type="button" className="ax-ws-add" aria-label={`Add ${childLevel} to ${n.name}`} aria-expanded={adding === n.id} onClick={() => { setName(''); setAdding(a => a === n.id ? null : n.id); if (hasKids) open([n.id]) }}><Plus size={14} aria-hidden="true" /></button>}
      </div>
      {adding === n.id && <form className="ax-newform ax-newform-nested" onSubmit={e => { e.preventDefault(); void submit(n.id) }}>
        <input aria-label={`New ${childLevel} name`} placeholder={`New ${childLevel}…`} value={name} onChange={e => setName(e.target.value)} autoFocus />
        <button type="submit" disabled={busy || !name.trim()} aria-label={`Create ${childLevel}`}><Plus size={15} aria-hidden="true" /></button>
      </form>}
      {hasKids && <div className="ax-collapse" data-open={isOpen} inert={!isOpen || undefined}>
        <ul className="ax-subs" role="group">{n.children.map(renderNode)}</ul>
      </div>}
    </li>
  }

  return <ul ref={rootRef} className="ax-ws" role="tree" aria-label="Workspaces">{tree.map(renderNode)}</ul>
}
