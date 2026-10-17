/** Guards for server-side link fetching (SSRF): only public http(s) hosts on standard ports, no embedded credentials. */

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa', '.corp', '.intranet']

function blockedIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0)
    || (a === 198 && (b === 18 || b === 19))
}

/** Returns a reason when the URL must not be fetched, otherwise null. Expects a WHATWG URL (hosts already normalised, e.g. 0x7f.1 → 127.0.0.1). */
export function unsafeUrlReason(url: URL): string | null {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Only http(s) links can be fetched.'
  if (url.username || url.password) return 'Links with embedded credentials are not supported.'
  if (url.port && url.port !== '80' && url.port !== '443') return 'Only standard web ports (80 and 443) are supported.'
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!host) return 'This link has no host.'
  if (host.includes(':')) return 'IP-address links (IPv6) are not supported.'
  if (host === 'localhost' || BLOCKED_SUFFIXES.some(s => host.endsWith(s))) return 'Local and internal addresses cannot be fetched.'
  if (blockedIPv4(host)) return 'Private and internal addresses cannot be fetched.'
  if (!host.includes('.')) return 'Internal host names cannot be fetched.'
  return null
}
