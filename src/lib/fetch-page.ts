import { htmlToText, type PageText } from './html-text'
import { unsafeUrlReason } from './url-safety'

export const MAX_PAGE_BYTES = 3 * 1024 * 1024
export const MAX_REDIRECTS = 5
export const FETCH_TIMEOUT_MS = 12_000
export const MIN_READABLE_CHARS = 80

/** An error whose message is safe to show to the user. */
export class FetchPageError extends Error {}

export type FetchedPage = PageText & { finalUrl: string; truncated: boolean }

async function readCapped(res: Response, cap: number): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  if (!res.body) return { bytes: new Uint8Array(await res.arrayBuffer()).slice(0, cap), truncated: false }
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0, truncated = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > cap) { chunks.push(value.slice(0, value.length - (size - cap))); truncated = true; await reader.cancel(); break }
    chunks.push(value)
  }
  const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of chunks) { bytes.set(c, at); at += c.length }
  return { bytes, truncated }
}

function decode(bytes: Uint8Array, contentType: string): string {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ?? 'utf-8'
  try { return new TextDecoder(charset).decode(bytes) } catch { return new TextDecoder('utf-8').decode(bytes) }
}

/** Fetches a public web page and returns its readable text. Every redirect hop is re-validated. `fetchImpl` is injectable for tests. */
export async function fetchPage(rawUrl: string, fetchImpl: typeof fetch = fetch): Promise<FetchedPage> {
  let url: URL
  try { url = new URL(rawUrl) } catch { throw new FetchPageError('That is not a valid link.') }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const reason = unsafeUrlReason(url)
    if (reason) throw new FetchPageError(reason)
    let res: Response
    try {
      res = await fetchImpl(url.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'user-agent': 'FootprintBot/1.0 (+knowledge workspace link import)', accept: 'text/html,application/xhtml+xml,text/plain,text/markdown;q=0.9,*/*;q=0.1' },
      })
    } catch { throw new FetchPageError('Could not reach this page (it may be down, blocked, or too slow).') }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new FetchPageError('The page redirected without a destination.')
      try { url = new URL(location, url) } catch { throw new FetchPageError('The page redirected to an invalid address.') }
      continue
    }
    if (res.status === 401 || res.status === 403) throw new FetchPageError('This page requires a login or blocks automated access. Save it as a PDF or text file and upload that instead.')
    if (res.status === 404 || res.status === 410) throw new FetchPageError('This page was not found (404).')
    if (!res.ok) throw new FetchPageError(`The site returned an error (${res.status}).`)
    const contentType = res.headers.get('content-type') ?? ''
    const kind = /html|xml/i.test(contentType) ? 'html' : /^text\/(plain|markdown)/i.test(contentType) ? 'text' : /pdf/i.test(contentType) ? 'pdf' : contentType ? 'other' : 'html'
    if (kind === 'pdf') throw new FetchPageError('This link is a PDF. Download it and upload the file so its pages can be read.')
    if (kind === 'other') throw new FetchPageError(`Unsupported content type (${contentType.split(';')[0]}). Only web pages and text are supported.`)
    const { bytes, truncated } = await readCapped(res, MAX_PAGE_BYTES)
    const body = decode(bytes, contentType)
    const page: PageText = kind === 'html' ? htmlToText(body) : { title: null, text: body.replace(/\r\n?/g, '\n').trim() }
    if (page.text.length < MIN_READABLE_CHARS) throw new FetchPageError('Very little readable text was found. The page may need JavaScript or a login to show its content.')
    return { ...page, finalUrl: url.toString(), truncated }
  }
  throw new FetchPageError('The page redirected too many times.')
}
