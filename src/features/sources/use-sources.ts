import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type Collection = { id: string; name: string; description: string | null }
export type Source = { id: string; title: string; source_type: string; status: string; collection_id: string | null; engineering_analysis_status: string; engineering_summary: string | null }

const SOURCE_COLUMNS = 'id, title, source_type, status, collection_id, engineering_analysis_status, engineering_summary'

export function sourceStatus(status: string): 'indexed' | 'processing' | 'reference' {
  if (status === 'ready' || status === 'indexed') return 'indexed'
  if (status === 'error') return 'reference'
  return 'processing'
}

type Options = {
  activeWorkspace: string
  setNotice: (message: string) => void
  setBusy: (busy: boolean) => void
  /** Called with the new source id once a text file has been saved and is ready to analyze. */
  onTextSourceAdded: (sourceId: string) => void
}

/** Collections and sources of the active workspace: loading, search, upload, link ingestion, removal and rename. */
export function useSources({ activeWorkspace, setNotice, setBusy, onTextSourceAdded }: Options) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [collectionName, setCollectionName] = useState('')
  const [search, setSearch] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  useEffect(() => {
    if (!activeWorkspace) { setCollections([]); setSources([]); return }
    let cancelled = false
    void (async () => {
      const [{ data: cols }, { data: srcs }] = await Promise.all([
        supabase.from('collections').select('id, name, description').eq('workspace_id', activeWorkspace).order('created_at'),
        supabase.from('sources').select(SOURCE_COLUMNS).eq('workspace_id', activeWorkspace).order('created_at'),
      ])
      if (cancelled) return
      setCollections(cols ?? [])
      setCollectionName(cols?.[0]?.name ?? '')
      setSources(srcs ?? [])
    })()
    return () => { cancelled = true }
  }, [activeWorkspace])

  const visibleSources = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? sources.filter(s => s.title.toLowerCase().includes(query)) : sources
  }, [sources, search])

  const collectionId = collections[0]?.id ?? null

  const uploadFile = async (file: File) => {
    const ok = /\.(pdf|md|markdown|txt)$/i.test(file.name)
    if (!ok) { setNotice('Only PDF, Markdown, and text files are supported.'); return }
    if (file.size > 20 * 1024 * 1024) { setNotice('Files must be 20 MB or smaller.'); return }
    setBusy(true); setNotice(`Uploading “${file.name}”…`)
    const path = `${activeWorkspace}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error: upErr } = await supabase.storage.from('sources').upload(path, file, { contentType: file.type || undefined })
    if (upErr) { setBusy(false); setNotice(`Upload failed: ${upErr.message}`); return }
    const isText = !/\.pdf$/i.test(file.name)
    const snippet = isText ? (await file.text()).slice(0, 2000) : null
    const { data, error } = await supabase.from('sources').insert({ workspace_id: activeWorkspace, collection_id: collectionId, title: file.name, source_type: 'file', file_path: path, status: isText ? 'ready' : 'indexing', content_snippet: snippet, metadata: { size: file.size, mime: file.type } }).select(SOURCE_COLUMNS).single()
    setBusy(false)
    if (error) { await supabase.storage.from('sources').remove([path]); setNotice(`Could not save source: ${error.message}`); return }
    setSources(s => [...s, data]); setNotice(`Added “${file.name}”.`)
    if (isText) onTextSourceAdded(data.id)
  }

  const addLink = async () => {
    let url: URL
    try { url = new URL(linkUrl.trim()); if (!/^https?:$/.test(url.protocol)) throw new Error() } catch { setNotice('Enter a valid http(s) link.'); return }
    setBusy(true)
    const { data, error } = await supabase.from('sources').insert({ workspace_id: activeWorkspace, collection_id: collectionId, title: url.hostname + url.pathname.replace(/\/$/, ''), source_type: 'link', url: url.toString(), status: 'ready' }).select(SOURCE_COLUMNS).single()
    setBusy(false)
    if (error) { setNotice(`Could not add link: ${error.message}`); return }
    setSources(s => [...s, data]); setLinkUrl(''); setLinkOpen(false); setNotice('Link added.')
  }

  const removeSource = async (src: Source) => {
    if (!window.confirm(`Remove “${src.title}”?`)) return
    const { data: row } = await supabase.from('sources').select('file_path').eq('id', src.id).single()
    const { error } = await supabase.from('sources').delete().eq('id', src.id)
    if (error) { setNotice(`Could not remove: ${error.message}`); return }
    if (row?.file_path) await supabase.storage.from('sources').remove([row.file_path])
    setSources(s => s.filter(x => x.id !== src.id)); setNotice(`Removed “${src.title}”.`)
  }

  const renameCollection = async () => {
    const name = collectionName.trim()
    if (!collectionId || !name) return
    const { error } = await supabase.from('collections').update({ name }).eq('id', collectionId)
    if (error) { setNotice(`Could not rename: ${error.message}`); return }
    setCollections(c => c.map(x => x.id === collectionId ? { ...x, name } : x)); setNotice('Collection renamed.')
  }

  return {
    collections, sources, setSources, visibleSources, collectionId,
    collectionName, setCollectionName, search, setSearch,
    linkOpen, setLinkOpen, linkUrl, setLinkUrl,
    uploadFile, addLink, removeSource, renameCollection,
  }
}
