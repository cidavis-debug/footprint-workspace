import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceTree } from '@/components/workspace-tree'
import type { WsNode } from '@/lib/workspace-tree'

const ws: WsNode[] = [
  { id: 'a', name: 'Actuator Program', parent_id: null },
  { id: 'b', name: 'Gearbox', parent_id: 'a' },
  { id: 'c', name: 'Housing', parent_id: 'b' },
  { id: 'd', name: 'Controller', parent_id: 'a' },
  { id: 'e', name: 'Test Campaign', parent_id: null },
]

describe('WorkspaceTree', () => {
  beforeEach(() => { localStorage.clear() })

  it('shows three levels as a tree and expands or collapses each branch independently', () => {
    render(<WorkspaceTree workspaces={ws} value="e" onChange={() => {}} />)
    const item = (name: string) => screen.getByText(name).closest('[role="treeitem"]')!
    expect(item('Actuator Program').getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Expand Actuator Program' }))
    expect(item('Actuator Program').getAttribute('aria-expanded')).toBe('true')
    expect(item('Gearbox').getAttribute('aria-level')).toBe('2')
    expect(item('Gearbox').getAttribute('aria-expanded')).toBe('false') // its own branch is still closed
    fireEvent.click(screen.getByRole('button', { name: 'Expand Gearbox' }))
    expect(item('Housing').getAttribute('aria-level')).toBe('3')
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Actuator Program' }))
    expect(item('Actuator Program').getAttribute('aria-expanded')).toBe('false')
    expect(item('Gearbox').getAttribute('aria-expanded')).toBe('true') // Gearbox kept its own state
  })

  it('reveals the active workspace by opening its ancestors', () => {
    render(<WorkspaceTree workspaces={ws} value="c" onChange={() => {}} />)
    expect(screen.getByText('Actuator Program').closest('[role="treeitem"]')!.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Gearbox').closest('[role="treeitem"]')!.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Housing').closest('[role="treeitem"]')!.getAttribute('aria-selected')).toBe('true')
  })

  it('switches workspaces at any level', () => {
    const onChange = vi.fn()
    render(<WorkspaceTree workspaces={ws} value="c" onChange={onChange} />)
    fireEvent.click(screen.getByText('Housing'))
    fireEvent.click(screen.getByText('Controller'))
    expect(onChange.mock.calls.map(c => c[0])).toEqual(['c', 'd'])
  })

  it('offers "add" on levels one and two but never on the third level', () => {
    render(<WorkspaceTree workspaces={ws} value="c" onChange={() => {}} onCreate={async () => {}} />)
    expect(screen.getByRole('button', { name: 'Add sub-workspace to Actuator Program' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add sub-sub-workspace to Gearbox' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Add .* to Housing/ })).toBeNull()
  })

  it('creates a sub-sub-workspace under the right parent and opens that branch', async () => {
    const onCreate = vi.fn(async () => {})
    render(<WorkspaceTree workspaces={ws} value="e" onChange={() => {}} onCreate={onCreate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expand Actuator Program' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add sub-sub-workspace to Controller' }))
    const input = screen.getByLabelText('New sub-sub-workspace name')
    fireEvent.change(input, { target: { value: 'Firmware' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create sub-sub-workspace' }))
    await vi.waitFor(() => expect(onCreate).toHaveBeenCalledWith('Firmware', 'd'))
    await vi.waitFor(() => expect(screen.queryByLabelText('New sub-sub-workspace name')).toBeNull())
  })

  it('renders an empty list safely', () => {
    const { container } = render(<WorkspaceTree workspaces={[]} value="" onChange={() => {}} />)
    expect(within(container).queryAllByRole('treeitem')).toHaveLength(0)
  })
})
