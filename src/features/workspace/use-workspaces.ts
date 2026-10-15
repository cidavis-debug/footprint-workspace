import type { User } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type WorkspaceNode = { id: string; name: string; parent_id: string | null }

type Options = {
  user: User | null
  /** Workspace id from the `?workspace=` search param; honoured only when it belongs to the user. */
  requestedWorkspace: string | undefined
  setNotice: (message: string) => void
  setBusy: (busy: boolean) => void
}

/** Workspace list, active selection and creation for the signed-in user. */
export function useWorkspaces({ user, requestedWorkspace, setNotice, setBusy }: Options) {
  const [workspaces, setWorkspaces] = useState<WorkspaceNode[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  /** Always holds the latest active workspace, so async work can detect that the user switched away. */
  const currentWorkspace = useRef(activeWorkspace)
  currentWorkspace.current = activeWorkspace

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setDataLoading(true)
    void (async () => {
      const { data: ws } = await supabase.from('workspaces').select('id, name, parent_id').order('created_at')
      if (cancelled) return
      const list = ws ?? []
      setWorkspaces(list)
      const first = list[0]?.id ?? ''
      setActiveWorkspace(current => list.some(w => w.id === requestedWorkspace) ? requestedWorkspace ?? first : current || first)
      setDataLoading(false)
    })()
    return () => { cancelled = true }
  }, [user, requestedWorkspace])

  const createWorkspace = async (name: string, parentId: string | null) => {
    if (!user) return
    setBusy(true)
    const { data, error } = await supabase.from('workspaces').insert({ owner_id: user.id, name, parent_id: parentId }).select('id, name, parent_id').single()
    setBusy(false)
    if (error) { setNotice(`Could not create workspace: ${error.message}`); return }
    setWorkspaces(w => [...w, data])
    setActiveWorkspace(data.id)
    setNotice(`Workspace “${name}” created.`)
  }

  return { workspaces, activeWorkspace, setActiveWorkspace, dataLoading, currentWorkspace, createWorkspace }
}
