import { ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/integrations/supabase/client'
import { countMatches, highlightParts, splitSections } from '@/lib/source-preview'

type Row = {
  id: string; title: string; source_type: string; url: string | null; file_path: string | null; status: string
  content_text: string | null; content_snippet: string | null; metadata: unknown; created_at: string; engineering_summary: string | null
}

const COLUMNS = 'id, title, source_type, url, file_path, status, content_text, content_snippet, metadata, created_at, engineering_summary'
const typeLabel = (t: string) => t === 'link' ? 'Link' : t === 'text' ? 'Saved text' : 'File'
const metaOf = (m: unknown) => (m && typeof m === 'object' ? m as Record<string, unknown> : {})

/** Full extracted text of one source, split by page/slide/sheet, with find-in-text. */
export function SourcePreview({ sourceId, onClose }: { sourceId: string | null; onClose: () => void }) {
  const [row, setRow] = useState<Row | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setRow(null); setError(''); setQuery(''); setActive(0)
    if (!sourceId) return
    let cancelled = false
    setLoading(true)
    void supabase.from('sources').select(COLUMNS).eq('id', sourceId).maybeSingle().then(({ data, error: failure }) => {
      if (cancelled) return
      setLoading(false)
      if (failure || !data) setError('Could not load this source.'); else setRow(data)
    })
    return () => { cancelled = true }
  }, [sourceId])

  useEffect(() => {
    if (!sourceId) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sourceId, onClose])

  const text = row?.content_text || row?.content_snippet || ''
  const sections = useMemo(() => splitSections(text), [text])
  const total = useMemo(() => countMatches(sections, query), [sections, query])

  useEffect(() => { setActive(0) }, [query])
  useEffect(() => {
    const marks = bodyRef.current?.querySelectorAll('mark[data-hit]')
    marks?.forEach((m, i) => m.toggleAttribute('data-current', i === active))
    marks?.[active]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [active, total, query])

  if (!sourceId || typeof document === 'undefined') return null
  const meta = metaOf(row?.metadata)
  const version = typeof meta['analysis_version'] === 'number' ? meta['analysis_version'] : typeof meta['version'] === 'number' ? meta['version'] : 1
  const step = (d: number) => total > 0 && setActive(a => (a + d + total) % total)

  const openFile = async () => {
    if (!row?.file_path) return
    const { data, error: failure } = await supabase.storage.from('sources').createSignedUrl(row.file_path, 60)
    if (failure || !data) { setError('Could not open the original file.'); return }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  // Rendered on <body> so it stacks above the Sources panel regardless of the layout's own stacking contexts.
  return createPortal(<>
    <div className="ax-preview-scrim" onClick={onClose} aria-hidden="true" />
    <aside className="ax-preview" role="dialog" aria-modal="true" aria-label={row ? `Preview of ${row.title}` : 'Source preview'}>
      <header className="ax-preview-head">
        <div>
          <h2 title={row?.title}>{row?.title ?? 'Loading…'}</h2>
          {row && <p className="lp-mono ax-preview-meta">
            {typeLabel(row.source_type)} · {row.status}{version > 1 ? ` · version ${version}` : ''} · {text.length.toLocaleString()} characters · saved {new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}{meta['saved_via'] === 'extension' ? ' · from browser extension' : ''}
          </p>}
        </div>
        <button ref={closeRef} type="button" className="ax-iconbtn" aria-label="Close preview" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </header>

      {row && <div className="ax-preview-tools">
        <input type="search" aria-label="Find in this source" placeholder="Find in this source" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1) } }} />
        <span className="lp-mono ax-preview-count" aria-live="polite">{query.trim().length < 2 ? '' : total === 0 ? 'No matches' : `${active + 1} of ${total}`}</span>
        <button type="button" className="ax-iconbtn" aria-label="Previous match" disabled={total === 0} onClick={() => step(-1)}><ChevronUp size={16} aria-hidden="true" /></button>
        <button type="button" className="ax-iconbtn" aria-label="Next match" disabled={total === 0} onClick={() => step(1)}><ChevronDown size={16} aria-hidden="true" /></button>
        {row.url && <a className="ax-iconbtn" href={row.url} target="_blank" rel="noreferrer noopener" aria-label="Open original link"><ExternalLink size={16} aria-hidden="true" /></a>}
        {row.file_path && <button type="button" className="ax-iconbtn" aria-label="Open original file" onClick={() => void openFile()}><ExternalLink size={16} aria-hidden="true" /></button>}
      </div>}

      <div className="ax-preview-body" ref={bodyRef}>
        {loading && <p className="ax-note">Loading…</p>}
        {error && <p role="alert" className="ax-note">{error}</p>}
        {row && !text && <p className="ax-note">{row.source_type === 'link' && row.status !== 'ready' ? 'The page has not been read yet, or it could not be read.' : 'No text was extracted from this source.'}</p>}
        {row?.engineering_summary && <p className="ax-preview-summary"><b>Summary</b> {row.engineering_summary}</p>}
        {sections.map((s, i) => <section key={i} className="ax-preview-section">
          {s.label && <p className="ax-preview-label lp-mono">{s.label}</p>}
          <p className="ax-preview-text">{highlightParts(s.text, query).map((p, k) => p.hit
            ? <mark key={k} data-hit="">{p.text}</mark>
            : <span key={k}>{p.text}</span>)}</p>
        </section>)}
      </div>
    </aside>
  </>, document.body)
}
