// Footprint AI Clipper — logic shared by the popup and the tests. Plain JavaScript, no build step.
// Talks to Supabase over its REST API with the signed-in user's token, so row-level security decides what is allowed.

export const MAX_TEXT_CHARS = 200000
export const MIN_TEXT_CHARS = 20

const readBody = async res => {
  const text = await res.text()
  try { return text ? JSON.parse(text) : null } catch { return text }
}
const errorMessage = (body, fallback) => (body && typeof body === 'object' && (body.msg || body.error_description || body.message || body.error)) || fallback

/** Sign-in calls carry only the project key; data calls carry the user's token. (Publishable keys must not be sent as a Bearer token.) */
function authHeaders(cfg, token) {
  return { apikey: cfg.SUPABASE_KEY, 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }
}

function toSession(body, now) {
  return { access_token: body.access_token, refresh_token: body.refresh_token, expires_at: body.expires_at ?? now + (body.expires_in ?? 3600), email: body.user?.email ?? '' }
}

export async function signIn(cfg, email, password, fetchImpl = fetch, now = Math.floor(Date.now() / 1000)) {
  const res = await fetchImpl(`${cfg.SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: authHeaders(cfg), body: JSON.stringify({ email, password }) })
  const body = await readBody(res)
  if (!res.ok || !body?.access_token) throw new Error(errorMessage(body, 'Sign-in failed. Check your email and password.'))
  return toSession(body, now)
}

export async function refreshSession(cfg, session, fetchImpl = fetch, now = Math.floor(Date.now() / 1000)) {
  const res = await fetchImpl(`${cfg.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: authHeaders(cfg), body: JSON.stringify({ refresh_token: session.refresh_token }) })
  const body = await readBody(res)
  if (!res.ok || !body?.access_token) throw new Error('Your session expired. Please sign in again.')
  return { ...toSession(body, now), email: body.user?.email ?? session.email }
}

/** Returns a usable session (refreshing it when close to expiry) or null when the user must sign in. `store` has get()/set()/clear(). */
export async function ensureSession(cfg, store, fetchImpl = fetch, now = Math.floor(Date.now() / 1000)) {
  const session = await store.get()
  if (!session?.access_token) return null
  if (session.expires_at - 60 > now) return session
  try { const fresh = await refreshSession(cfg, session, fetchImpl, now); await store.set(fresh); return fresh } catch { await store.clear(); return null }
}

async function rest(cfg, session, path, init = {}, fetchImpl = fetch) {
  const res = await fetchImpl(`${cfg.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...authHeaders(cfg, session.access_token), ...(init.headers ?? {}) } })
  const body = await readBody(res)
  if (!res.ok) throw new Error(errorMessage(body, `Request failed (${res.status}).`))
  return body
}

export const listWorkspaces = (cfg, session, fetchImpl) => rest(cfg, session, 'workspaces?select=id,name,parent_id&order=created_at.asc', {}, fetchImpl)

export async function firstCollectionId(cfg, session, workspaceId, fetchImpl) {
  const rows = await rest(cfg, session, `collections?select=id&workspace_id=eq.${workspaceId}&order=created_at.asc&limit=1`, {}, fetchImpl)
  return rows?.[0]?.id ?? null
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

/** Workspaces as an indented list: main workspaces first, each followed by its sub-workspaces. */
export function workspaceOptions(workspaces) {
  const mains = workspaces.filter(w => !w.parent_id)
  return mains.flatMap(m => [{ id: m.id, label: m.name }, ...workspaces.filter(k => k.parent_id === m.id).map(k => ({ id: k.id, label: `   ${k.name}` }))])
}

export function normalizeText(raw) {
  return String(raw ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT_CHARS)
}

/** The row stored for a clipped page or selection. Stored as type "text" so the app never tries to re-download it (it may be behind a login). */
export function buildSourceRow({ workspaceId, collectionId, kind, pageTitle, url, text, hash, now = new Date() }) {
  const clean = normalizeText(text)
  const base = (pageTitle || url || 'Untitled page').replace(/\s+/g, ' ').trim()
  return {
    workspace_id: workspaceId,
    collection_id: collectionId,
    title: (kind === 'selection' ? `Selection · ${base}` : base).slice(0, 200),
    source_type: 'text',
    url: /^https?:\/\//i.test(url ?? '') ? url : null,
    status: 'ready',
    content_text: clean,
    content_snippet: clean.slice(0, 2000),
    metadata: { clipped: kind, saved_via: 'extension', clipped_at: now.toISOString(), content_hash: hash, size: clean.length, ...(pageTitle ? { page_title: pageTitle } : {}) },
  }
}

/** Saves a clip unless the same text is already in the workspace. Resolves to { status: 'saved' | 'duplicate', title, id }. */
export async function saveClip(cfg, session, { workspaceId, kind, pageTitle, url, text }, fetchImpl = fetch) {
  const clean = normalizeText(text)
  if (clean.length < MIN_TEXT_CHARS) throw new Error(kind === 'selection' ? 'Highlight some text on the page first.' : 'This page has very little readable text to save.')
  const hash = await sha256Hex(clean)
  const existing = await rest(cfg, session, `sources?select=id,title&workspace_id=eq.${workspaceId}&metadata->>content_hash=eq.${hash}&limit=1`, {}, fetchImpl)
  if (existing?.length) return { status: 'duplicate', title: existing[0].title, id: existing[0].id }
  const collectionId = await firstCollectionId(cfg, session, workspaceId, fetchImpl)
  const row = buildSourceRow({ workspaceId, collectionId, kind, pageTitle, url, text: clean, hash })
  const saved = await rest(cfg, session, 'sources', { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify(row) }, fetchImpl)
  return { status: 'saved', title: row.title, id: saved?.[0]?.id ?? null }
}

/** Saves the page address as a link source. Footprint AI reads the page the next time the app opens it, exactly like Add link. Resolves to { status: 'saved' | 'duplicate', title, id }. */
export async function saveWebsite(cfg, session, { workspaceId, url, pageTitle, now = new Date() }, fetchImpl = fetch) {
  let parsed
  try { parsed = new URL(url) } catch { throw new Error('This page has no web address to save.') }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('Only http(s) websites can be saved.')
  const address = parsed.toString()
  const existing = await rest(cfg, session, `sources?select=id,title&workspace_id=eq.${workspaceId}&url=eq.${encodeURIComponent(address)}&limit=1`, {}, fetchImpl)
  if (existing?.length) return { status: 'duplicate', title: existing[0].title, id: existing[0].id }
  const collectionId = await firstCollectionId(cfg, session, workspaceId, fetchImpl)
  const title = ((pageTitle || '').replace(/\s+/g, ' ').trim() || parsed.hostname + parsed.pathname.replace(/\/$/, '')).slice(0, 200)
  const row = { workspace_id: workspaceId, collection_id: collectionId, title, source_type: 'link', url: address, status: 'indexing', metadata: { saved_via: 'extension', clipped: 'website', clipped_at: now.toISOString() } }
  const saved = await rest(cfg, session, 'sources', { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify(row) }, fetchImpl)
  return { status: 'saved', title, id: saved?.[0]?.id ?? null }
}

// ---- runs inside the web page (injected with chrome.scripting.executeScript) -------------------------------------------
// These functions are serialized and executed in the page, so they must not reference anything outside themselves.

/** Cheap check used when the popup opens: the page title, address, and how much text is highlighted. */
export function pageInfo() {
  return { title: document.title.trim(), url: location.href, selectionLength: String(window.getSelection?.() ?? '').trim().length }
}

/** The highlighted text, plus the page title and address. */
export function readSelection() {
  return { title: document.title.trim(), url: location.href, selection: String(window.getSelection?.() ?? '').trim() }
}
