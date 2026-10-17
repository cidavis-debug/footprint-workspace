export type ExistingSource = { id: string; title: string; metadata: unknown }
export type UploadDecision =
  | { kind: 'duplicate'; existing: ExistingSource }
  | { kind: 'same-name'; existing: ExistingSource }
  | { kind: 'new' }

/** SHA-256 of the file bytes, or null where Web Crypto is unavailable (non-secure contexts). */
export async function sha256Hex(file: Blob): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

export const storedHash = (metadata: unknown): string | null => {
  const h = metadata && typeof metadata === 'object' ? (metadata as { content_hash?: unknown }).content_hash : null
  return typeof h === 'string' ? h : null
}
export const storedVersion = (metadata: unknown): number => {
  const v = metadata && typeof metadata === 'object' ? (metadata as { version?: unknown }).version : null
  return typeof v === 'number' && v >= 1 ? v : 1
}

/** Identical bytes already stored → duplicate. Same file name with different bytes → candidate new version. */
export function classifyUpload(existing: ExistingSource[], name: string, hash: string | null): UploadDecision {
  if (hash) { const dup = existing.find(s => storedHash(s.metadata) === hash); if (dup) return { kind: 'duplicate', existing: dup } }
  const key = name.trim().toLowerCase()
  const same = existing.find(s => s.title.trim().toLowerCase() === key)
  return same ? { kind: 'same-name', existing: same } : { kind: 'new' }
}
