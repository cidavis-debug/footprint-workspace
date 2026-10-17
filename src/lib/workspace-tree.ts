/** Workspaces nest up to three levels (workspace → sub-workspace → sub-sub-workspace) using the existing parent_id column. */

export const MAX_WORKSPACE_DEPTH = 3
export const LEVEL_NAMES = ['workspace', 'sub-workspace', 'sub-sub-workspace'] as const

export type WsNode = { id: string; name: string; parent_id: string | null }
export type TreeNode<T extends WsNode = WsNode> = T & { depth: number; children: TreeNode<T>[] }

/** The parent chain of a workspace (nearest parent first). Stops at unknown parents and never loops on bad data. */
function chainOf(list: WsNode[], id: string): WsNode[] {
  const byId = new Map(list.map(w => [w.id, w]))
  const out: WsNode[] = []
  const seen = new Set<string>([id])
  let at = byId.get(id)?.parent_id ?? null
  while (at && !seen.has(at)) {
    const parent = byId.get(at)
    if (!parent) break
    out.push(parent); seen.add(at); at = parent.parent_id
  }
  return out
}

/** 1 for a top-level workspace, 2 for a sub-workspace, 3 for a sub-sub-workspace; 0 when the id is unknown. */
export function depthOf(list: WsNode[], id: string): number {
  return list.some(w => w.id === id) ? chainOf(list, id).length + 1 : 0
}

/** Whether a new workspace may be created under `parentId` (null means top level). */
export function canNest(list: WsNode[], parentId: string | null): boolean {
  if (!parentId) return true
  const depth = depthOf(list, parentId)
  return depth > 0 && depth < MAX_WORKSPACE_DEPTH
}

/** Ids from the top-level ancestor down to the direct parent (excludes the workspace itself). */
export function ancestorIds(list: WsNode[], id: string): string[] {
  return chainOf(list, id).map(w => w.id).reverse()
}

/** Names from the top-level ancestor down to the workspace itself, for breadcrumbs. */
export function pathNames(list: WsNode[], id: string): string[] {
  const self = list.find(w => w.id === id)
  return self ? [...chainOf(list, id).map(w => w.name).reverse(), self.name] : []
}

/** Forest of workspaces in their original order. Workspaces whose parent is missing are shown at the top level. */
export function buildTree<T extends WsNode>(list: T[]): TreeNode<T>[] {
  const ids = new Set(list.map(w => w.id))
  const kids = new Map<string | null, T[]>()
  for (const w of list) {
    const key = w.parent_id && ids.has(w.parent_id) && w.parent_id !== w.id ? w.parent_id : null
    kids.set(key, [...(kids.get(key) ?? []), w])
  }
  const placed = new Set<string>()
  const grow = (w: T, depth: number): TreeNode<T> => {
    placed.add(w.id)
    return { ...w, depth, children: (kids.get(w.id) ?? []).filter(c => !placed.has(c.id)).map(c => grow(c, depth + 1)) }
  }
  const roots = (kids.get(null) ?? []).map(w => grow(w, 1))
  // A parent cycle would otherwise hide its members; surface them at the top level instead.
  for (const w of list) if (!placed.has(w.id)) roots.push(grow(w, 1))
  return roots
}
