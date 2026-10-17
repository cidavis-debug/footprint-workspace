import { describe, expect, it } from 'vitest'
import { fetchPage, FetchPageError } from '@/lib/fetch-page'
import { htmlToText } from '@/lib/html-text'
import { unsafeUrlReason } from '@/lib/url-safety'

const reason = (u: string) => unsafeUrlReason(new URL(u))

describe('unsafeUrlReason', () => {
  it('allows ordinary public pages', () => {
    for (const u of ['https://example.com/spec', 'http://docs.example.org:80/a', 'https://sub.example.co.uk:443/']) expect(reason(u)).toBeNull()
  })
  it('blocks local, private, and metadata addresses, including obfuscated forms', () => {
    for (const u of [
      'http://localhost/', 'http://app.localhost/', 'http://127.0.0.1/', 'http://0x7f.1/', 'http://2130706433/', 'http://10.0.0.5/',
      'http://172.16.0.1/', 'http://192.168.1.1/', 'http://169.254.169.254/latest/meta-data', 'http://100.64.0.1/', 'http://0.0.0.0/',
      'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://printer.local/', 'http://db.internal/', 'http://intranet/', 'http://224.0.0.1/',
    ]) expect(reason(u), u).not.toBeNull()
  })
  it('blocks credentials, odd ports, and non-http schemes', () => {
    expect(reason('https://user:pw@example.com/')).not.toBeNull()
    expect(reason('http://example.com:6379/')).not.toBeNull()
    expect(reason('ftp://example.com/file')).not.toBeNull()
    expect(reason('file:///etc/passwd')).not.toBeNull()
  })
})

describe('htmlToText', () => {
  const page = `<html><head><title>Atlas Power Notes</title><style>.x{}</style></head><body>
    <nav>Home | About | Login</nav>
    <main><h1>Power</h1><p>The main bus runs at <b>24&nbsp;V</b> &amp; supports 15 A.</p>
    <ul><li>CAN at 500 kbit/s</li><li>IP54 enclosure</li></ul><script>var secret = 1</script></main>
    <footer>Copyright</footer></body></html>`
  it('keeps main content, drops chrome and scripts, decodes entities', () => {
    const { title, text } = htmlToText(page)
    expect(title).toBe('Atlas Power Notes')
    expect(text).toContain('Power')
    expect(text).toContain('The main bus runs at 24 V & supports 15 A.')
    expect(text).toContain('- CAN at 500 kbit/s')
    expect(text).toContain('- IP54 enclosure')
    for (const gone of ['Home | About', 'Copyright', 'secret', '.x{}']) expect(text).not.toContain(gone)
  })
})

const html = (body: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...headers } })
const longPage = `<html><head><title>T</title></head><body><main><p>${'Engineering content about the rover power system. '.repeat(10)}</p></main></body></html>`

describe('fetchPage', () => {
  it('returns readable text and the final url', async () => {
    const page = await fetchPage('https://example.com/a', async () => html(longPage))
    expect(page.title).toBe('T')
    expect(page.text).toContain('rover power system')
    expect(page.finalUrl).toBe('https://example.com/a')
  })
  it('follows redirects but re-checks every hop', async () => {
    const hops = new Map<string, Response>([
      ['https://example.com/a', new Response(null, { status: 302, headers: { location: 'https://example.com/b' } })],
      ['https://example.com/b', html(longPage)],
    ])
    expect((await fetchPage('https://example.com/a', async u => hops.get(String(u))!)).finalUrl).toBe('https://example.com/b')
    await expect(fetchPage('https://example.com/a', async () => new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } }))).rejects.toThrow(/internal/i)
  })
  it('stops redirect loops', async () => {
    await expect(fetchPage('https://example.com/a', async () => new Response(null, { status: 302, headers: { location: '/a' } }))).rejects.toThrow(/too many/i)
  })
  it('rejects unsafe urls without fetching', async () => {
    let called = false
    await expect(fetchPage('http://localhost:3000/', async () => { called = true; return html(longPage) })).rejects.toBeInstanceOf(FetchPageError)
    expect(called).toBe(false)
  })
  it('gives clear messages for PDFs, logins, missing pages and empty shells', async () => {
    await expect(fetchPage('https://example.com/x.pdf', async () => new Response('%PDF', { headers: { 'content-type': 'application/pdf' } }))).rejects.toThrow(/PDF/)
    await expect(fetchPage('https://example.com/', async () => html('', 403))).rejects.toThrow(/login/i)
    await expect(fetchPage('https://example.com/', async () => html('', 404))).rejects.toThrow(/404/)
    await expect(fetchPage('https://example.com/', async () => html('<html><body><div id="root"></div><script>app()</script></body></html>'))).rejects.toThrow(/readable text/i)
    await expect(fetchPage('https://example.com/', async () => new Response('x', { headers: { 'content-type': 'image/png' } }))).rejects.toThrow(/Unsupported/)
  })
  it('accepts plain text pages', async () => {
    const text = 'Requirement R-101: the bus shall be 24 V. '.repeat(5)
    const page = await fetchPage('https://example.com/spec.txt', async () => new Response(text, { headers: { 'content-type': 'text/plain' } }))
    expect(page.text).toContain('R-101')
  })
})
