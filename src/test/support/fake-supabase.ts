import { createElement, type ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * Test doubles for the browser Supabase client, auth context and router.
 * Nothing here talks to a network: every query is answered by a handler the test registers.
 */

export type Call = {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  payload?: unknown
  columns?: string | undefined
  filters: Array<[string, unknown]>
  single: boolean
}
export type Result = { data: unknown; error: { message: string } | null }
export type Handler = (call: Call) => Result | Promise<Result>

export const ok = (data: unknown): Result => ({ data, error: null })
export const fail = (message: string): Result => ({ data: null, error: { message } })

export const fake = {
  calls: [] as Call[],
  handlers: {} as Record<string, Handler>,
  upload: vi.fn<(path: string, file: File, options?: unknown) => Promise<{ error: { message: string } | null }>>(),
  remove: vi.fn<(paths: string[]) => Promise<{ error: null }>>(),
  createSignedUrl: vi.fn(),
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  },
  reset() {
    this.calls = []
    this.handlers = {}
    this.upload.mockReset().mockResolvedValue({ error: null })
    this.remove.mockReset().mockResolvedValue({ error: null })
    this.createSignedUrl.mockReset()
    for (const fn of Object.values(this.auth)) fn.mockReset()
  },
  /** Calls recorded for one table/op, for assertions. */
  where(table: string, op: Call['op']) {
    return this.calls.filter(c => c.table === table && c.op === op)
  },
}

export function defaultResult(call: Call): Result {
  if (call.op === 'select') return ok(call.single ? null : [])
  if (call.op === 'insert') {
    const row = Array.isArray(call.payload) ? call.payload : { id: `new-${call.table}`, ...(call.payload as object) }
    return ok(row)
  }
  return ok(null)
}

function query(table: string) {
  const call: Call = { table, op: 'select', filters: [], single: false }
  const self = {
    select(columns?: string) { call.columns = columns; return self },
    insert(payload: unknown) { call.op = 'insert'; call.payload = payload; return self },
    update(payload: unknown) { call.op = 'update'; call.payload = payload; return self },
    delete() { call.op = 'delete'; return self },
    eq(column: string, value: unknown) { call.filters.push([column, value]); return self },
    neq(column: string, value: unknown) { call.filters.push([`!${column}`, value]); return self },
    order() { return self },
    range() { return self },
    limit() { return self },
    single() { call.single = true; return self },
    maybeSingle() { call.single = true; return self },
    then(resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) {
      return Promise.resolve()
        .then(async () => {
          fake.calls.push(call)
          const handler = fake.handlers[table]
          return handler ? await handler(call) : defaultResult(call)
        })
        .then(resolve, reject)
    },
  }
  return self
}

export const supabaseModule = {
  supabase: {
    from: (table: string) => query(table),
    storage: { from: () => ({ upload: fake.upload, remove: fake.remove, createSignedUrl: fake.createSignedUrl }) },
    auth: fake.auth,
  },
}

/** Mutable auth context returned by the mocked `useAuth`. */
export const authState = {
  user: { id: 'user-1', email: 'ada@example.com' } as { id: string; email: string } | null,
  loading: false,
  signOut: vi.fn(async () => {}),
}

/** Mutable router state returned by the mocked TanStack Router helpers. */
export const routerState = {
  search: {} as Record<string, unknown>,
  navigate: vi.fn(),
  preload: vi.fn(),
}

type LinkProps = { to?: string; search?: unknown; children?: ReactNode } & Record<string, unknown>

export const routerModule = {
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useSearch: () => routerState.search,
    useNavigate: () => routerState.navigate,
  }),
  useNavigate: () => routerState.navigate,
  useRouter: () => ({ preloadRoute: routerState.preload }),
  Navigate: ({ to, search }: { to: string; search?: unknown }) =>
    createElement('div', { 'data-testid': 'navigate', 'data-to': to, 'data-search': JSON.stringify(search ?? null) }),
  Link: ({ to, search: _search, children, ...rest }: LinkProps) => createElement('a', { href: to, ...rest }, children),
  redirect: (options: unknown) => ({ redirected: options }),
  Outlet: () => null,
}

/** jsdom lacks these browser APIs, which the /app screen uses. */
export function installBrowserStubs() {
  if (!('ResizeObserver' in globalThis)) {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  }
  const proto = HTMLDialogElement.prototype as unknown as { showModal: () => void; close: () => void }
  proto.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  proto.close = function (this: HTMLDialogElement) { this.removeAttribute('open') }
  let n = 0
  if (!globalThis.crypto?.randomUUID) {
    vi.stubGlobal('crypto', { ...(globalThis.crypto ?? {}), randomUUID: () => `uuid-${++n}` })
  }
}

/** A deferred promise to hold a server function open mid-test. */
export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
