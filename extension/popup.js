import * as cfg from './config.js'
import { ensureSession, listWorkspaces, pageInfo, readSelection, saveClip, saveWebsite, signIn, workspaceOptions } from './lib.js'

const $ = id => document.getElementById(id)
const store = {
  get: async () => (await chrome.storage.local.get('session')).session ?? null,
  set: session => chrome.storage.local.set({ session }),
  clear: () => chrome.storage.local.remove('session'),
}
const UNREADABLE = /^(chrome|edge|about|brave|devtools|view-source|chrome-extension|moz-extension):/i

let session = null
let tab = null
let canSaveSite = false // the tab has an http(s) address
let canRead = false     // extensions may run a script in the tab (needed only for Save selection)
let selectionLength = 0
let workspaceReady = false

function status(text, kind = '') { $('status').textContent = text; $('status').dataset.kind = kind }
function show(view) { for (const id of ['loading', 'signin', 'main']) $(id).hidden = id !== view; $('signout').hidden = view !== 'main' }

function refreshButtons(isBusy = false) {
  $('save-website').disabled = isBusy || !workspaceReady || !canSaveSite
  $('save-selection').disabled = isBusy || !workspaceReady || !canRead || selectionLength === 0
  $('selection-hint').textContent = !canRead ? '' : selectionLength === 0 ? 'To save just part of a page, highlight it and reopen this popup.' : `${selectionLength.toLocaleString()} characters highlighted.`
}

async function readTab(func) {
  const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func })
  return injection?.result
}

async function showMain() {
  show('main'); status('')
  ;[tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  canSaveSite = /^https?:\/\//i.test(tab?.url ?? '')
  canRead = !!tab?.id && canSaveSite && !/chromewebstore\.google\.com|chrome\.google\.com\/webstore/.test(tab.url)
  $('page').textContent = tab?.title || tab?.url || 'No page'
  $('page').title = tab?.url ?? ''
  selectionLength = 0
  workspaceReady = false
  if (canRead) {
    try { selectionLength = (await readTab(pageInfo))?.selectionLength ?? 0 } catch { canRead = false }
  }
  if (!canSaveSite) status('This kind of page can’t be saved. Open a normal website.', 'error')
  refreshButtons()
  try {
    const options = workspaceOptions(await listWorkspaces(cfg, session))
    const { workspaceId } = await chrome.storage.local.get('workspaceId')
    $('workspace').replaceChildren(...options.map(o => Object.assign(document.createElement('option'), { value: o.id, textContent: o.label })))
    if (options.some(o => o.id === workspaceId)) $('workspace').value = workspaceId
    workspaceReady = options.length > 0
    if (!workspaceReady) status('No workspace found for this account.', 'error')
  } catch (e) { status(e.message || 'Could not load your workspaces.', 'error') }
  refreshButtons()
}

async function save(kind) {
  const workspaceId = $('workspace').value
  if (!workspaceId) return
  refreshButtons(true); status('Saving…')
  try {
    session = await ensureSession(cfg, store)
    if (!session) { show('signin'); status('Your session expired. Please sign in again.', 'error'); return }
    let result
    if (kind === 'website') {
      result = await saveWebsite(cfg, session, { workspaceId, url: tab.url, pageTitle: tab.title })
    } else {
      const page = await readTab(readSelection)
      if (!page) throw new Error('Could not read this page.')
      result = await saveClip(cfg, session, { workspaceId, kind: 'selection', pageTitle: page.title, url: page.url, text: page.selection })
    }
    await chrome.storage.local.set({ workspaceId })
    const name = $('workspace').selectedOptions[0]?.textContent.trim() ?? 'your workspace'
    status(result.status === 'duplicate'
      ? `Already saved as “${result.title}”.`
      : kind === 'website'
        ? `Saved the link to ${name}. Open Footprint AI and it will read the page; then run Analyze.`
        : `Saved the selection to ${name}. Open Footprint AI and run Analyze to check it for conflicts.`, 'ok')
    $('open-app').href = `${cfg.APP_URL}/app?workspace=${workspaceId}&sources=true`
    $('open-app').hidden = false
  } catch (e) { status(e.message || 'Could not save.', 'error') }
  finally { refreshButtons() }
}

$('signin').addEventListener('submit', async e => {
  e.preventDefault()
  status('Signing in…')
  try {
    session = await signIn(cfg, $('email').value.trim(), $('password').value)
    await store.set(session)
    $('password').value = ''
    await showMain()
  } catch (err) { status(err.message || 'Sign-in failed.', 'error') }
})
$('signout').addEventListener('click', async () => { await store.clear(); session = null; $('open-app').hidden = true; show('signin'); status('Signed out.') })
$('save-website').addEventListener('click', () => void save('website'))
$('save-selection').addEventListener('click', () => void save('selection'))

;(async () => {
  try { session = await ensureSession(cfg, store) } catch { session = null }
  if (session) await showMain(); else show('signin')
})()
