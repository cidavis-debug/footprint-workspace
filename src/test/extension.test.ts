// @ts-nocheck — the extension is plain JavaScript outside src/
import { describe, expect, it } from 'vitest'
import { buildSourceRow, ensureSession, listWorkspaces, normalizeText, readSelection, saveClip, saveWebsite, signIn, workspaceOptions } from '../../extension/lib.js'

const cfg = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_KEY: 'sb_publishable_test' }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const session = { access_token: 'tok', refresh_token: 'ref', expires_at: 9_999_999_999, email: 'a@b.co' }
const memoryStore = (initial = null) => { let s = initial; return { get: async () => s, set: async v => { s = v }, clear: async () => { s = null }, peek: () => s } }

describe('sign-in and sessions', () => {
  it('signs in with the project key only (no bearer) and returns a session', async () => {
    let seen
    const fetchImpl = async (url, init) => { seen = { url, init }; return json({ access_token: 'a', refresh_token: 'r', expires_in: 3600, user: { email: 'me@x.co' } }) }
    const s = await signIn(cfg, 'me@x.co', 'pw', fetchImpl, 1000)
    expect(seen.url).toBe('https://x.supabase.co/auth/v1/token?grant_type=password')
    expect(seen.init.headers.authorization).toBeUndefined()
    expect(seen.init.headers.apikey).toBe('sb_publishable_test')
    expect(JSON.parse(seen.init.body)).toEqual({ email: 'me@x.co', password: 'pw' })
    expect(s).toEqual({ access_token: 'a', refresh_token: 'r', expires_at: 4600, email: 'me@x.co' })
  })
  it('shows the server message when sign-in fails', async () => {
    await expect(signIn(cfg, 'a', 'b', async () => json({ error_description: 'Invalid login credentials' }, 400))).rejects.toThrow('Invalid login credentials')
  })
  it('reuses a fresh session, refreshes an expiring one, and clears a dead one', async () => {
    expect(await ensureSession(cfg, memoryStore(session), async () => { throw new Error('no network call expected') }, 1000)).toEqual(session)
    const store = memoryStore({ ...session, expires_at: 1030 })
    const refreshed = await ensureSession(cfg, store, async () => json({ access_token: 'new', refresh_token: 'r2', expires_in: 3600, user: { email: 'a@b.co' } }), 1000)
    expect(refreshed.access_token).toBe('new')
    expect(store.peek().access_token).toBe('new')
    const dead = memoryStore({ ...session, expires_at: 10 })
    expect(await ensureSession(cfg, dead, async () => json({}, 400), 1000)).toBeNull()
    expect(dead.peek()).toBeNull()
    expect(await ensureSession(cfg, memoryStore(null), fetch, 1000)).toBeNull()
  })
})

describe('workspaces', () => {
  it('lists with the user token and indents sub-workspaces under their parent', async () => {
    let seen
    const rows = [{ id: 'a', name: 'Atlas', parent_id: null }, { id: 'c', name: 'Other', parent_id: null }, { id: 'b', name: 'Drive', parent_id: 'a' }]
    const out = await listWorkspaces(cfg, session, async (url, init) => { seen = { url, init }; return json(rows) })
    expect(seen.init.headers.authorization).toBe('Bearer tok')
    expect(workspaceOptions(out).map(o => o.label)).toEqual(['Atlas', '   Drive', 'Other'])
  })
})

describe('saving clips', () => {
  const clip = { workspaceId: 'w1', kind: 'selection', pageTitle: 'Supplier datasheet', url: 'https://vendor.example/ds', text: 'Max input voltage: 12 V.\nOperating temperature: -40 to 85 C.' }
  const router = (handlers) => async (url, init = {}) => {
    const path = String(url).replace('https://x.supabase.co/rest/v1/', '')
    for (const [prefix, fn] of Object.entries(handlers)) if (path.startsWith(prefix)) return fn(path, init)
    throw new Error('unexpected request ' + path)
  }

  it('inserts a text source for a selection with the page address, a content hash, and the first collection', async () => {
    let inserted
    const out = await saveClip(cfg, session, clip, router({
      'sources?select': () => json([]),
      'collections': () => json([{ id: 'col1' }]),
      'sources': (_p, init) => { inserted = JSON.parse(init.body); expect(init.headers.prefer).toBe('return=representation'); return json([{ id: 'new1' }], 201) },
    }))
    expect(out).toEqual({ status: 'saved', title: 'Selection · Supplier datasheet', id: 'new1' })
    expect(inserted).toMatchObject({ workspace_id: 'w1', collection_id: 'col1', source_type: 'text', status: 'ready', url: 'https://vendor.example/ds' })
    expect(inserted.content_text).toContain('Max input voltage')
    expect(inserted.metadata).toMatchObject({ clipped: 'selection', saved_via: 'extension', page_title: 'Supplier datasheet' })
    expect(inserted.metadata.content_hash).toHaveLength(64)
  })

  it('skips text that is already in the workspace', async () => {
    const out = await saveClip(cfg, session, clip, router({ 'sources?select': (p) => { expect(p).toContain('metadata->>content_hash=eq.'); return json([{ id: 'old', title: 'Earlier save' }]) } }))
    expect(out).toEqual({ status: 'duplicate', title: 'Earlier save', id: 'old' })
  })

  it('titles selections and rejects empty ones', async () => {
    expect(buildSourceRow({ workspaceId: 'w', collectionId: null, kind: 'selection', pageTitle: 'Datasheet', url: 'https://a.co', text: 'x'.repeat(30), hash: 'h' }).title).toBe('Selection · Datasheet')
    await expect(saveClip(cfg, session, { ...clip, kind: 'selection', text: '  ' }, router({}))).rejects.toThrow('Highlight some text')
    await expect(saveClip(cfg, session, { ...clip, text: 'tiny' }, router({}))).rejects.toThrow('Highlight some text')
  })

  it('surfaces database errors', async () => {
    await expect(saveClip(cfg, session, clip, router({ 'sources?select': () => json({ message: 'permission denied' }, 403) }))).rejects.toThrow('permission denied')
  })

  it('does not store non-web addresses and caps very long text', () => {
    expect(buildSourceRow({ workspaceId: 'w', collectionId: null, kind: 'selection', pageTitle: 't', url: 'file:///secret', text: 'y'.repeat(30), hash: 'h' }).url).toBeNull()
    expect(normalizeText('a'.repeat(250000))).toHaveLength(200000)
    expect(normalizeText('a\r\n\r\n\r\n\r\nb  \n')).toBe('a\n\nb')
  })
})

describe('saving a website link', () => {
  const router = (handlers) => async (url, init = {}) => {
    const path = String(url).replace('https://x.supabase.co/rest/v1/', '')
    for (const [prefix, fn] of Object.entries(handlers)) if (path.startsWith(prefix)) return fn(path, init)
    throw new Error('unexpected request ' + path)
  }

  it('saves a link source that the app will read, in the first collection', async () => {
    let inserted, query
    const out = await saveWebsite(cfg, session, { workspaceId: 'w1', url: 'https://vendor.example/ds?id=7#top', pageTitle: '  Supplier   datasheet ' }, router({
      'sources?select': p => { query = p; return json([]) },
      'collections': () => json([{ id: 'col1' }]),
      'sources': (_p, init) => { inserted = JSON.parse(init.body); return json([{ id: 'n1' }], 201) },
    }))
    expect(out).toEqual({ status: 'saved', title: 'Supplier datasheet', id: 'n1' })
    expect(query).toContain('url=eq.' + encodeURIComponent('https://vendor.example/ds?id=7#top'))
    expect(inserted).toMatchObject({ workspace_id: 'w1', collection_id: 'col1', source_type: 'link', status: 'indexing', url: 'https://vendor.example/ds?id=7#top' })
    expect(inserted.content_text).toBeUndefined()
    expect(inserted.metadata).toMatchObject({ saved_via: 'extension', clipped: 'website' })
  })

  it('uses the address as the title when the page has none', async () => {
    let inserted
    await saveWebsite(cfg, session, { workspaceId: 'w1', url: 'https://vendor.example/docs/spec/', pageTitle: '' }, router({
      'sources?select': () => json([]), 'collections': () => json([]), 'sources': (_p, init) => { inserted = JSON.parse(init.body); return json([{ id: 'n' }]) },
    }))
    expect(inserted.title).toBe('vendor.example/docs/spec')
    expect(inserted.collection_id).toBeNull()
  })

  it('skips a link that is already in the workspace', async () => {
    const out = await saveWebsite(cfg, session, { workspaceId: 'w1', url: 'https://vendor.example/ds' }, router({ 'sources?select': () => json([{ id: 'old', title: 'Datasheet' }]) }))
    expect(out).toEqual({ status: 'duplicate', title: 'Datasheet', id: 'old' })
  })

  it('refuses addresses that are not websites', async () => {
    for (const url of ['chrome://extensions', 'file:///etc/passwd', 'not a url', '']) await expect(saveWebsite(cfg, session, { workspaceId: 'w1', url }, router({}))).rejects.toThrow()
  })
})

describe('selection reader (runs inside the web page)', () => {
  it('returns the title, address, and highlighted text', () => {
    document.title = 'Atlas Datasheet'
    document.body.innerHTML = '<p id="p">The bus runs at 24 V.</p>'
    const range = document.createRange(); range.selectNodeContents(document.getElementById('p'))
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range)
    const r = readSelection()
    expect(r.title).toBe('Atlas Datasheet')
    expect(r.selection).toBe('The bus runs at 24 V.')
    expect(typeof r.url).toBe('string')
    sel.removeAllRanges()
    expect(readSelection().selection).toBe('')
  })
})
