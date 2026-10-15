import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { askFootprint } from '@/lib/ask.functions'
import { analyzeEngineeringSource } from '@/lib/engineering.functions'
import { getRadar } from '@/lib/radar.functions'
import { authState, deferred, defaultResult, fail, fake, installBrowserStubs, ok, routerState, type Call } from './support/fake-supabase'

vi.mock('@/integrations/supabase/client', async () => (await import('./support/fake-supabase')).supabaseModule)
vi.mock('@tanstack/react-router', async () => (await import('./support/fake-supabase')).routerModule)
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('@/hooks/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-auth')>('@/hooks/use-auth')
  const { authState: state } = await import('./support/fake-supabase')
  return { ...actual, useAuth: () => state }
})
vi.mock('@/lib/ask.functions', () => ({ askFootprint: vi.fn() }))
vi.mock('@/lib/engineering.functions', () => ({ analyzeEngineeringSource: vi.fn() }))
vi.mock('@/lib/radar.functions', () => ({ getRadar: vi.fn(), reviewRadarAlert: vi.fn() }))

const ask = vi.mocked(askFootprint)
const analyze = vi.mocked(analyzeEngineeringSource)
const radar = vi.mocked(getRadar)

const WORKSPACES = [
  { id: 'ws-1', name: 'Alpha', parent_id: null },
  { id: 'ws-2', name: 'Beta', parent_id: null },
  { id: 'ws-1a', name: 'Alpha Sub', parent_id: 'ws-1' },
]
const source = (id: string, title: string, over: Record<string, unknown> = {}) => ({
  id, title, source_type: 'file', status: 'ready', collection_id: 'col-1', engineering_analysis_status: 'pending', engineering_summary: null, ...over,
})
let sourcesByWorkspace: Record<string, ReturnType<typeof source>[]> = {}
let alerts: Record<string, unknown>[] = []

const workspaceFilter = (c: Call) => c.filters.find(([k]) => k === 'workspace_id')?.[1] as string | undefined

function installHandlers() {
  fake.handlers['workspaces'] = c => (c.op === 'select' ? ok(WORKSPACES) : defaultResult(c))
  fake.handlers['collections'] = c => (c.op === 'select' ? ok([{ id: 'col-1', name: 'General', description: null }]) : ok(null))
  fake.handlers['sources'] = c => {
    if (c.op === 'select' && !c.single) return ok(sourcesByWorkspace[workspaceFilter(c) ?? ''] ?? [])
    if (c.op === 'select' && c.columns === 'file_path') return ok({ file_path: 'ws-1/abc-Spec.pdf' })
    if (c.op === 'select') return ok({ engineering_analysis_status: 'complete', engineering_summary: 'Fresh summary' })
    return defaultResult(c)
  }
  fake.handlers['engineering_alerts'] = c => (c.op === 'select' ? ok(alerts) : ok(null))
  fake.handlers['engineering_claims'] = c => (c.op === 'select' ? ok([]) : ok(null))
}

type AppComponent = () => React.JSX.Element
async function appComponent() {
  const { Route } = await import('@/routes/app')
  return (Route as unknown as { component: AppComponent }).component
}
async function renderApp() {
  const App = await appComponent()
  const view = render(<App />)
  await screen.findByText(/Answering from “/)
  return view
}
const notice = (text: string | RegExp) => waitFor(() => expect(screen.getAllByText(text).length).toBeGreaterThan(0))
async function openDrawer() {
  fireEvent.click(screen.getByRole('button', { name: 'Sources' }))
  return within(await screen.findByRole('dialog'))
}
function file(name: string, content = 'hello', size?: number) {
  const f = new File([content], name, { type: name.endsWith('.pdf') ? 'application/pdf' : 'text/plain' })
  Object.defineProperty(f, 'text', { value: async () => content })
  if (size !== undefined) Object.defineProperty(f, 'size', { value: size })
  return f
}
const pick = (container: HTMLElement, f: File) => {
  const input = container.querySelector('input[type=file]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [f] } })
}
type AskResult = Awaited<ReturnType<typeof askFootprint>>
const answer = (text: string, citations: AskResult['citations'] = []): AskResult => ({ answer: text, citations, error: null })

beforeEach(() => {
  installBrowserStubs()
  fake.reset()
  sourcesByWorkspace = { 'ws-1': [], 'ws-2': [] }
  alerts = []
  installHandlers()
  authState.user = { id: 'user-1', email: 'ada@example.com' }
  authState.loading = false
  routerState.search = {}
  ask.mockReset(); analyze.mockReset(); radar.mockReset()
  analyze.mockResolvedValue({ status: 'complete', claims: 0, alerts: 0, error: null })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('/app authentication', () => {
  it('shows a status while the session loads', async () => {
    authState.loading = true
    const App = await appComponent()
    render(<App />)
    expect(screen.getByRole('status').textContent).toBe('Opening your workspace…')
  })

  it('redirects signed-out visitors to /login with a return path and loads nothing', async () => {
    authState.user = null
    const App = await appComponent()
    render(<App />)
    const nav = screen.getByTestId('navigate')
    expect(nav.dataset['to']).toBe('/login')
    expect(JSON.parse(nav.dataset['search']!)).toEqual({ redirect: '/app' })
    expect(fake.calls).toHaveLength(0)
  })
})

describe('workspace selection and switching', () => {
  it('loads the first workspace by default and scopes collections and sources to it', async () => {
    await renderApp()
    expect(screen.getByText('Answering from “Alpha” sources.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Alpha' }).getAttribute('aria-current')).toBe('true')
    const wsFilters = fake.calls.filter(c => c.table === 'sources' || c.table === 'collections').map(workspaceFilter)
    expect(wsFilters.length).toBeGreaterThan(0)
    expect(new Set(wsFilters)).toEqual(new Set(['ws-1']))
  })

  it('honours the ?workspace= search param and ignores unknown ids', async () => {
    routerState.search = { workspace: 'ws-2' }
    await renderApp()
    expect(screen.getByText('Answering from “Beta” sources.')).toBeTruthy()
    cleanup()
    routerState.search = { workspace: 'not-mine' }
    await renderApp()
    expect(screen.getByText('Answering from “Alpha” sources.')).toBeTruthy()
  })

  it('switches workspace, reloads sources and clears the thread', async () => {
    sourcesByWorkspace['ws-1'] = [source('s1', 'Spec.pdf')]
    sourcesByWorkspace['ws-2'] = [source('s9', 'Beta.pdf')]
    ask.mockResolvedValue(answer('Alpha answer'))
    await renderApp()
    fireEvent.click(screen.getByText('What existing work could constrain this decision?'))
    await screen.findByText('Alpha answer')
    fireEvent.click(screen.getByRole('button', { name: 'Beta' }))
    await screen.findByText('Answering from “Beta” sources.')
    await waitFor(() => expect(screen.queryByText('Alpha answer')).toBeNull())
    const drawer = await openDrawer()
    await drawer.findByText('Beta.pdf')
    expect(drawer.queryByText('Spec.pdf')).toBeNull()
  })

  it('creates a workspace and a sub-workspace for the signed-in owner', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: /Add workspace/ }))
    fireEvent.change(screen.getByLabelText('New workspace name'), { target: { value: 'Gamma' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }))
    await notice('Workspace “Gamma” created.')
    expect(fake.where('workspaces', 'insert')[0]!.payload).toEqual({ owner_id: 'user-1', name: 'Gamma', parent_id: null })
    expect(screen.getByRole('button', { name: 'Gamma' }).getAttribute('aria-current')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    fireEvent.change(screen.getByLabelText('New sub-workspace in Alpha'), { target: { value: 'Child' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Create sub-workspace' })[0]!)
    await notice('Workspace “Child” created.')
    expect(fake.where('workspaces', 'insert')[1]!.payload).toEqual({ owner_id: 'user-1', name: 'Child', parent_id: 'ws-1' })
  })

  it('reports a failed workspace creation without switching', async () => {
    fake.handlers['workspaces'] = c => (c.op === 'select' ? ok(WORKSPACES) : fail('boom'))
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: /Add workspace/ }))
    fireEvent.change(screen.getByLabelText('New workspace name'), { target: { value: 'Gamma' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }))
    await notice('Could not create workspace: boom')
    expect(screen.getByRole('button', { name: 'Alpha' }).getAttribute('aria-current')).toBe('true')
  })
})

describe('file uploads', () => {
  it('rejects unsupported types and oversized files before touching storage', async () => {
    const { container } = await renderApp()
    pick(container, file('image.png'))
    await notice('Only PDF, Markdown, and text files are supported.')
    pick(container, file('big.pdf', 'x', 21 * 1024 * 1024))
    await notice('Files must be 20 MB or smaller.')
    expect(fake.upload).not.toHaveBeenCalled()
    expect(fake.where('sources', 'insert')).toHaveLength(0)
  })

  it('uploads a text file, records it as ready and starts engineering analysis', async () => {
    const { container } = await renderApp()
    const drawer = await openDrawer()
    await drawer.findByLabelText('Collection name') // collections have loaded, so uploads are filed into one
    pick(container, file('notes.txt', 'Bus voltage is 28 V'))
    await notice('Added “notes.txt”.')
    const path = fake.upload.mock.calls[0]![0]
    expect(path).toMatch(/^ws-1\/.+-notes\.txt$/)
    expect(fake.where('sources', 'insert')[0]!.payload).toMatchObject({
      workspace_id: 'ws-1', collection_id: 'col-1', title: 'notes.txt', source_type: 'file', file_path: path, status: 'ready', content_snippet: 'Bus voltage is 28 V',
    })
    await waitFor(() => expect(analyze).toHaveBeenCalledWith({ data: { sourceId: 'new-sources' } }))
  })

  it('queues a PDF for indexing without analysing it', async () => {
    const { container } = await renderApp()
    pick(container, file('spec.pdf'))
    await notice('Added “spec.pdf”.')
    expect(fake.where('sources', 'insert')[0]!.payload).toMatchObject({ status: 'indexing', content_snippet: null })
    expect(analyze).not.toHaveBeenCalled()
  })

  it('surfaces storage failures and does not create a source row', async () => {
    fake.upload.mockResolvedValue({ error: { message: 'nope' } })
    const { container } = await renderApp()
    pick(container, file('notes.txt'))
    await notice('Upload failed: nope')
    expect(fake.where('sources', 'insert')).toHaveLength(0)
  })

  it('removes the uploaded object when the source row cannot be saved', async () => {
    fake.handlers['sources'] = c => (c.op === 'insert' ? fail('rls') : ok([]))
    const { container } = await renderApp()
    pick(container, file('notes.txt'))
    await notice('Could not save source: rls')
    expect(fake.remove).toHaveBeenCalledWith([fake.upload.mock.calls[0]![0]])
  })
})

describe('link ingestion', () => {
  async function openLinkForm() {
    const drawer = await openDrawer()
    fireEvent.click(drawer.getByRole('button', { name: /Add link/ }))
    return { drawer, input: drawer.getByLabelText('Link URL') as HTMLInputElement }
  }

  it('rejects non-http(s) and malformed links', async () => {
    await renderApp()
    const { input } = await openLinkForm()
    for (const value of ['not a url', 'ftp://example.com/file']) {
      fireEvent.change(input, { target: { value } })
      fireEvent.submit(input.closest('form')!)
      await notice('Enter a valid http(s) link.')
    }
    expect(fake.where('sources', 'insert')).toHaveLength(0)
  })

  it('adds a valid link as a ready source and closes the form', async () => {
    await renderApp()
    const { drawer, input } = await openLinkForm()
    fireEvent.change(input, { target: { value: 'https://example.com/docs/' } })
    fireEvent.submit(input.closest('form')!)
    await notice('Link added.')
    expect(fake.where('sources', 'insert')[0]!.payload).toMatchObject({
      workspace_id: 'ws-1', collection_id: 'col-1', title: 'example.com/docs', source_type: 'link', url: 'https://example.com/docs/', status: 'ready',
    })
    expect(drawer.queryByLabelText('Link URL')).toBeNull()
  })

  it('reports insert failures', async () => {
    fake.handlers['sources'] = c => (c.op === 'insert' ? fail('denied') : ok([]))
    await renderApp()
    const { input } = await openLinkForm()
    fireEvent.change(input, { target: { value: 'https://example.com' } })
    fireEvent.submit(input.closest('form')!)
    await notice('Could not add link: denied')
  })
})

describe('source management', () => {
  beforeEach(() => { sourcesByWorkspace['ws-1'] = [source('s1', 'Spec.pdf'), source('s2', 'Notes.md')] })

  it('filters the source list by search text', async () => {
    await renderApp()
    const drawer = await openDrawer()
    await drawer.findByText('Spec.pdf')
    fireEvent.change(drawer.getByLabelText('Search sources'), { target: { value: 'notes' } })
    expect(drawer.queryByText('Spec.pdf')).toBeNull()
    expect(drawer.getByText('Notes.md')).toBeTruthy()
    fireEvent.change(drawer.getByLabelText('Search sources'), { target: { value: 'zzz' } })
    expect(drawer.getByText('No matches.')).toBeTruthy()
  })

  it('removes a source and its stored file after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await renderApp()
    const drawer = await openDrawer()
    fireEvent.click(await drawer.findByRole('button', { name: 'Options for Spec.pdf' }))
    await notice('Removed “Spec.pdf”.')
    expect(fake.where('sources', 'delete')[0]!.filters).toEqual([['id', 's1']])
    expect(fake.remove).toHaveBeenCalledWith(['ws-1/abc-Spec.pdf'])
    expect(drawer.queryByText('Spec.pdf')).toBeNull()
  })

  it('keeps the source when removal is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await renderApp()
    const drawer = await openDrawer()
    fireEvent.click(await drawer.findByRole('button', { name: 'Options for Spec.pdf' }))
    expect(fake.where('sources', 'delete')).toHaveLength(0)
    expect(fake.remove).not.toHaveBeenCalled()
  })

  it('renames the collection', async () => {
    await renderApp()
    const drawer = await openDrawer()
    fireEvent.change(drawer.getByLabelText('Collection name'), { target: { value: 'Avionics' } })
    fireEvent.click(drawer.getByRole('button', { name: 'Rename' }))
    await notice('Collection renamed.')
    const update = fake.where('collections', 'update')[0]!
    expect(update.payload).toEqual({ name: 'Avionics' })
    expect(update.filters).toEqual([['id', 'col-1']])
  })
})

describe('AI chat', () => {
  const firstStarter = 'What existing work could constrain this decision?'
  const citation = { id: 's1', title: 'Spec.pdf', kind: 'file' as const, url: null, quote: '28 V bus' }
  const evidenceLink = () => screen.getAllByRole('link').find(a => a.getAttribute('href') === '#evidence')

  it('submits a typed question for the active workspace and renders cited answers', async () => {
    ask.mockResolvedValue(answer('The bus is 28 V.', [citation]))
    await renderApp()
    fireEvent.change(screen.getByLabelText('Ask your workspace'), { target: { value: 'What is the bus voltage?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }))
    await screen.findByText('The bus is 28 V.')
    expect(ask).toHaveBeenCalledWith({ data: { workspaceId: 'ws-1', question: 'What is the bus voltage?' } })
    expect(evidenceLink()?.textContent).toContain('Spec.pdf')
  })

  it('opens supporting evidence for a citation', async () => {
    ask.mockResolvedValue(answer('The bus is 28 V.', [citation]))
    radar.mockResolvedValue({
      workspaces: [], workspaceId: 'ws-1', alerts: [], claims: [],
      sources: [{ id: 's1', title: 'Spec.pdf', source_type: 'file', url: null, file_path: null, content_snippet: 'Bus: 28 V bus', status: 'ready', engineering_analysis_status: 'complete', engineering_summary: null }],
    } as unknown as Awaited<ReturnType<typeof getRadar>>)
    await renderApp()
    fireEvent.click(screen.getByText(firstStarter))
    await screen.findByText('The bus is 28 V.')
    fireEvent.click(evidenceLink()!)
    await screen.findByText('“28 V bus”')
    expect(radar).toHaveBeenCalledWith({ data: { workspaceId: 'ws-1' } })
  })

  it('shows the server error and removes the pending turn', async () => {
    ask.mockResolvedValue({ answer: '', citations: [], error: 'Add a source to this workspace first.' })
    await renderApp()
    fireEvent.click(screen.getByText(firstStarter))
    await notice('Add a source to this workspace first.')
    expect(screen.getByText(firstStarter)).toBeTruthy()
    expect(screen.queryByText('Reading your sources…')).toBeNull()
  })

  it('shows a generic error when the request throws', async () => {
    ask.mockRejectedValue(new Error('network'))
    await renderApp()
    fireEvent.click(screen.getByText(firstStarter))
    await notice('Something went wrong asking Footprint.')
  })

  it('cancels generation and ignores the late response', async () => {
    const pending = deferred<AskResult>()
    ask.mockReturnValue(pending.promise)
    await renderApp()
    fireEvent.click(screen.getByText(firstStarter))
    fireEvent.click(await screen.findByRole('button', { name: 'Stop generating' }))
    await screen.findByText('Generation stopped.')
    pending.resolve(answer('Late answer'))
    await new Promise(r => setTimeout(r, 0))
    expect(screen.queryByText('Late answer')).toBeNull()
    expect(screen.getByText('Generation stopped.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Stop generating' })).toBeNull()
  })

  it('discards an answer that arrives after switching workspace', async () => {
    const pending = deferred<AskResult>()
    ask.mockReturnValue(pending.promise)
    await renderApp()
    fireEvent.click(screen.getByText(firstStarter))
    await screen.findByText('Reading your sources…')
    fireEvent.click(screen.getByRole('button', { name: 'Beta' }))
    await screen.findByText('Answering from “Beta” sources.')
    pending.resolve(answer('Alpha-only answer'))
    await new Promise(r => setTimeout(r, 0))
    expect(ask).toHaveBeenCalledWith({ data: { workspaceId: 'ws-1', question: firstStarter } })
    expect(screen.queryByText('Alpha-only answer')).toBeNull()
    expect((screen.getByText(firstStarter) as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('engineering analysis and alerts', () => {
  it('analyzes only indexed sources that are not yet complete', async () => {
    sourcesByWorkspace['ws-1'] = [
      source('s1', 'Spec.pdf'),
      source('s2', 'Done.md', { engineering_analysis_status: 'complete' }),
      source('s3', 'Draft.pdf', { status: 'indexing' }),
    ]
    await renderApp()
    const drawer = await openDrawer()
    await drawer.findByText('Spec.pdf')
    fireEvent.click(drawer.getByRole('button', { name: /Analyze existing sources/ }))
    await notice('Analyzed 1 source.')
    expect(analyze).toHaveBeenCalledTimes(1)
    expect(analyze).toHaveBeenCalledWith({ data: { sourceId: 's1' } })
    expect(drawer.getAllByText(/Engineering context · Analyzed/).length).toBe(2)
  })

  it('reports when nothing needs analysis', async () => {
    sourcesByWorkspace['ws-1'] = [source('s2', 'Done.md', { engineering_analysis_status: 'complete' })]
    await renderApp()
    const drawer = await openDrawer()
    await drawer.findByText('Done.md')
    fireEvent.click(drawer.getByRole('button', { name: /Analyze existing sources/ }))
    await notice('All indexed sources are already analyzed.')
    expect(analyze).not.toHaveBeenCalled()
  })

  it('shows analysis failures and keeps the source', async () => {
    fake.handlers['sources'] = c => {
      if (c.op === 'select' && !c.single) return ok([source('s1', 'Spec.pdf')])
      if (c.op === 'select') return ok(null)
      return defaultResult(c)
    }
    analyze.mockResolvedValue({ status: 'failed', claims: 0, alerts: 0, error: 'AI is not configured.' })
    await renderApp()
    const drawer = await openDrawer()
    await drawer.findByText('Spec.pdf')
    fireEvent.click(drawer.getByRole('button', { name: /Analyze existing sources/ }))
    // The bulk run's completion notice replaces the per-source error notice (existing behaviour).
    await notice('Analyzed 1 source.')
    expect(analyze).toHaveBeenCalledWith({ data: { sourceId: 's1' } })
    await drawer.findByText(/Analysis failed/)
    expect(drawer.getByText('Spec.pdf')).toBeTruthy()
  })

  it('lists open alerts and clears one when it is reviewed', async () => {
    alerts = [{ id: 'a1', alert_type: 'possible_conflict', severity: 'high', title: 'Possible conflict: bus voltage', summary: 'Two sources disagree.', status: 'open', new_claim_id: 'c1', related_claim_id: 'c2' }]
    await renderApp()
    const drawer = await openDrawer()
    await drawer.findByText('Possible conflict: bus voltage')
    expect(drawer.getByText('Engineering review suggestions (1)')).toBeTruthy()
    fireEvent.click(drawer.getByRole('button', { name: 'Mark reviewed' }))
    await waitFor(() => expect(drawer.queryByText('Possible conflict: bus voltage')).toBeNull())
    const update = fake.where('engineering_alerts', 'update')[0]!
    expect(update.payload).toEqual({ status: 'reviewed' })
    expect(update.filters).toEqual([['id', 'a1']])
  })

  it('keeps an alert visible and explains when the status update fails', async () => {
    alerts = [{ id: 'a1', alert_type: 'possible_conflict', severity: 'low', title: 'Check interface', summary: 'S', status: 'open', new_claim_id: 'c1', related_claim_id: null }]
    fake.handlers['engineering_alerts'] = c => (c.op === 'select' ? ok(alerts) : fail('rls'))
    await renderApp()
    const drawer = await openDrawer()
    await drawer.findByText('Check interface')
    fireEvent.click(drawer.getByRole('button', { name: 'Dismiss' }))
    await drawer.findByText('Could not update the review suggestion. Please try again.')
    expect(drawer.getByText('Check interface')).toBeTruthy()
  })
})
