import { describe, expect, it } from 'vitest'
import { ancestorIds, buildTree, canNest, depthOf, MAX_WORKSPACE_DEPTH, pathNames, type WsNode } from '@/lib/workspace-tree'

const w = (id: string, parent_id: string | null = null): WsNode => ({ id, name: id.toUpperCase(), parent_id })
const list = [w('a'), w('b', 'a'), w('c', 'b'), w('d', 'a'), w('e'), w('f', 'e')]

describe('workspace tree', () => {
  it('computes depth and nesting limits', () => {
    expect(MAX_WORKSPACE_DEPTH).toBe(3)
    expect(depthOf(list, 'a')).toBe(1)
    expect(depthOf(list, 'b')).toBe(2)
    expect(depthOf(list, 'c')).toBe(3)
    expect(depthOf(list, 'missing')).toBe(0)
    expect(canNest(list, null)).toBe(true)
    expect(canNest(list, 'a')).toBe(true)
    expect(canNest(list, 'b')).toBe(true)
    expect(canNest(list, 'c')).toBe(false) // a fourth level is not allowed
    expect(canNest(list, 'missing')).toBe(false)
  })

  it('builds a forest keeping order, depth, and parent-child links', () => {
    const tree = buildTree(list)
    expect(tree.map(n => n.id)).toEqual(['a', 'e'])
    const a = tree[0]
    expect(a.children.map(n => [n.id, n.depth])).toEqual([['b', 2], ['d', 2]])
    expect(a.children[0].children.map(n => [n.id, n.depth])).toEqual([['c', 3]])
    expect(tree[1].children.map(n => n.id)).toEqual(['f'])
  })

  it('lists ancestors and breadcrumb names from the top down', () => {
    expect(ancestorIds(list, 'c')).toEqual(['a', 'b'])
    expect(ancestorIds(list, 'a')).toEqual([])
    expect(pathNames(list, 'c')).toEqual(['A', 'B', 'C'])
    expect(pathNames(list, 'x')).toEqual([])
  })

  it('shows workspaces with a missing parent at the top level', () => {
    const tree = buildTree([w('a'), w('orphan', 'gone')])
    expect(tree.map(n => n.id)).toEqual(['a', 'orphan'])
    expect(depthOf([w('orphan', 'gone')], 'orphan')).toBe(1)
  })

  it('survives parent cycles without looping or dropping workspaces', () => {
    const cyc = [w('x', 'y'), w('y', 'x'), w('z', 'z')]
    const tree = buildTree(cyc)
    const ids: string[] = []
    const walk = (nodes: typeof tree) => nodes.forEach(n => { ids.push(n.id); walk(n.children) })
    walk(tree)
    expect(ids.sort()).toEqual(['x', 'y', 'z'])
    expect(depthOf(cyc, 'x')).toBeGreaterThan(0)
  })
})
