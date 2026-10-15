# Frontend Migration Plan — Footprint AI

Status: **AUDIT ONLY. No implementation changes have been made.** Awaiting approval.
Branch: `frontend-redesign`. Audit date: 2026-10-14.

## 1. Architecture summary

| Layer | What exists |
| --- | --- |
| Framework | TanStack Start 1.168 + TanStack Router (file routes, `src/routes`), React 19, Vite 8, Tailwind 4, Nitro build targeting Cloudflare. |
| Config | `vite.config.ts` is a single call to `@lovable.dev/vite-tanstack-config` (supplies React, Tailwind, Start, Nitro, tsconfig paths, env injection). |
| Server entry | `src/server.ts` (SSR error wrapper), `src/start.ts` (CSRF + error middleware, client middleware that attaches the Supabase JWT to every server fn). |
| Auth | `src/hooks/use-auth.tsx` (`AuthProvider`, `useAuth`, `safeRedirect`) over `supabase.auth`. Server side: `requireSupabaseAuth` middleware validates the Bearer token and builds a per-request, RLS-scoped Supabase client. |
| Server functions | `src/lib/ask.functions.ts` (Gemini chat + citations), `engineering.functions.ts` (claim extraction + alert generation), `radar.functions.ts` (`getRadar`, `reviewRadarAlert`). All use `requireSupabaseAuth`; Gemini key read from `process.env.GEMINI_API_KEY` only on the server. |
| Pure domain logic | `src/lib/engineering-data.ts` — types, `filterAlerts`, `engineeringPrompt`, `suggestedQuestions`. Browser-safe; covered by tests. |
| Database | Supabase (`supabase/migrations/*.sql`, RLS + storage policies; generated `src/integrations/supabase/types.ts`). The browser also talks to Supabase directly (sources, collections, workspaces, claims, alerts, storage). |
| Routes | `/` (marketing), `/how-it-works`, `/collections`, `/security`, `/pricing`, `/login`, `/app` (chat + sources), `/_authenticated/radar` (`/radar`). `/app` is `ssr:false` and guards on `useAuth`; `/radar` guards in `beforeLoad`. |
| UI | Custom design system `src/design-system/footprint-0a8b1a` (Button, Input, Composer, Answer, CitationChip, SourcesDrawer, …), shadcn `src/components/ui/*` (nearly unused by the app), global CSS in `src/styles.css` (368 lines, class-based: `.app-shell`, `.chat-main`, `.radar-*`, `.hero`, …). |

Feature → code map:

| Feature | Where the behavior lives |
| --- | --- |
| Auth (sign in/up, sign out, redirect) | `routes/login.tsx` (inline `supabase.auth` calls), `hooks/use-auth.tsx`, `routes/_authenticated/route.tsx` |
| Workspaces + sub-workspaces | `routes/app.tsx` (`createWorkspace`, fetch), rendered by `components/app-shell.tsx` + `workspace-picker.tsx` |
| Collections (list/rename) | `routes/app.tsx` |
| Source upload / link ingestion / delete | `routes/app.tsx` (`uploadFile`, `addLink`, `removeSource`, direct Supabase storage + table writes) |
| AI chat + citations | `routes/app.tsx` (`ask`, `stop`, thread state) → `askFootprint` |
| Engineering analysis | `routes/app.tsx` (`analyze`, `analyzeExisting`) → `analyzeEngineeringSource`; per-source claim edit/delete in `components/engineering-context.tsx` (direct Supabase) |
| Engineering alerts (in sources drawer) | `components/engineering-context.tsx` `EngineeringAlerts` (direct Supabase) |
| Radar | `routes/_authenticated/radar.tsx` → `getRadar`/`reviewRadarAlert` via React Query |
| Evidence drawer | `components/source-evidence-drawer.tsx` (shared by chat and Radar; signed-URL file open) |

## 2. Baseline (before any change)

Environment: Windows, Node 24.19, **bun not installed** → deps installed with `npm install --no-package-lock` (`bun.lock` is the project lockfile and was not touched; `node_modules` is git-ignored).

| Check | Result |
| --- | --- |
| `vitest run` | **Pass** — 2 files, 6 tests. |
| `vite build` | **Pass** (client + SSR + Nitro/Cloudflare output). Build rewrites `src/routeTree.gen.ts` with CRLF line endings only; I reverted it. Working tree is clean. |
| `tsc --noEmit` | **Pass**, no errors. |
| `eslint .` | **Fails: 7,485 problems (7,473 errors).** ~5,600 are CRLF (`Delete ␍`, Windows `core.autocrlf=true` vs. Prettier `endOfLine`), ~1,876 are Prettier formatting of the dense single-line style (`app.tsx` alone 238). Only 13 non-Prettier findings: 12 `react-refresh/only-export-components` warnings, 1 `prefer-const` in generated `previewAuthStorage.ts`. **Lint is not a usable gate today**; treat as a pre-existing baseline failure. |

Coverage gap: the 6 tests cover route matching and `engineering-data` pure functions only. **Nothing tests `/app` behavior** (upload, link, ask, analyze, workspace create) or server functions.

## 3. UI ↔ behavior coupling

Ranked by redesign risk:

1. **`src/routes/app.tsx` (277 lines) is the main problem.** One component holds ~25 `useState`s plus: Supabase reads/writes, file validation and storage upload, URL validation, server-fn calls, request cancellation (`requestId`, `currentWorkspace` refs), analysis queue, notices, and the JSX using design-system classes. Redesigning the Ask screen means rewriting this file, which is exactly where regressions would hide.
2. **`components/engineering-context.tsx`** — presentational `<details>` markup interleaved with direct Supabase queries/mutations for claims and alerts.
3. **`components/source-evidence-drawer.tsx`** — signed-URL file opening and `navigate` inside a presentational drawer.
4. **`components/app-shell.tsx` / `workspace-picker.tsx`** — mostly presentational with prop callbacks (good), but tree derivation (mains/subs/active title) and create-form state are inline. Two near-duplicate workspace pickers (rail + mobile picker).
5. **`routes/login.tsx`** — auth calls inline in the form component.
6. **`routes/_authenticated/radar.tsx`** — already uses React Query + server fns; coupling is light (filter/busy state, `filterAlerts` is pure). Lowest risk.
7. **`routes/index.tsx` + showcase components** — marketing only, no backend behavior; `useHeroDemo` and `ShowcaseSandbox` are self-contained fake demos.

Styling coupling: `styles.css` global class names (`.chat-main`, `.chat-dock`, `.app-rail`, …) and `--dock-height` set imperatively via `ResizeObserver` in `app.tsx`. The new theme should not be layered on these; see §5.

## 4. Lovable-specific dependencies

| Item | Impact on independent deployment | Action |
| --- | --- | --- |
| `@lovable.dev/vite-tanstack-config` (`vite.config.ts`) | Hides the whole Vite plugin stack. Works standalone but is a Lovable package (has a `minimumReleaseAgeExcludes` carve-out in `bunfig.toml`). | Keep for now. Later replace with explicit plugins (`tanstackStart`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `nitro`, `vite-tsconfig-paths`). Not needed for the redesign. |
| `*.asset.json` images (`src/assets/**`, `Brand`, `Illustration`, `footprint-walk`) | URLs are `/__l5e/assets-v1/<id>/…` — served by Lovable's platform. **Outside Lovable these 16 images 404.** The PNG bytes are not in the repo. | Download the originals and commit to `public/` / `src/assets`; swap `.asset.json` imports. Must happen before any non-Lovable deploy. The new landing page replaces most of them anyway. |
| `src/integrations/supabase/{client,client.server,auth-middleware,previewAuthStorage}.ts` | Marked "automatically generated, do not edit". `previewAuthStorage.ts` is Lovable editor postMessage session brokering (inert off Lovable preview zones). Error text says "Connect Supabase in Lovable Cloud". | Protect; do not edit on this branch. Safe off-Lovable; `previewAuthStorage` can be removed later. |
| `src/lib/lovable-error-reporting.ts`, `error-capture.ts` | Hooks into `window.__lovableEvents`; no-op elsewhere. | Leave. |
| `.lovable/`, `lovable.toml` | Design-system library registration. Harmless. | Leave. |
| `.env` **is committed** | Contains `SUPABASE_URL` and publishable (anon) key — not secret by design, but real project values are in git history. `GEMINI_API_KEY` / service-role key are *not* in the repo (read from runtime env). | Keep out of new work; consider `.env.example` + untracking later (history rewrite is off-limits). Confirm `GEMINI_API_KEY` is configured in whichever host is used. |
| Deploy target | Nitro build outputs a Cloudflare Worker (`wrangler.json`, `_headers`). | Fine; just needs Gemini + Supabase env vars on the host. |
| Git ↔ Lovable sync | Commits to the connected branch show up in the Lovable editor. | Never rebase/force-push published history; keep branch building. |

Two `supabase/config.toml` / `.env` references point at the same project (`qvlo…`); the roadmap calls it "external Supabase". No schema work is planned.

## 5. Proposed refactoring strategy (minimal)

Principle: **extract behavior outward into hooks/modules without changing what it does; leave JSX for the redesign.** Server functions, middleware, Supabase integration files, migrations and `engineering-data.ts` are not touched.

New layer `src/features/` (behavior only, no styling classes, no design-system imports):

```
src/features/
  workspace/
    use-workspaces.ts      // fetch list, active id, requestedWorkspace sync, createWorkspace, tree helpers (mains/subs/title)
  sources/
    use-sources.ts         // collections + sources load, uploadFile, addLink, removeSource, renameCollection, search
    source-status.ts       // sourceStatus() + types (Source, Collection)
  chat/
    use-chat.ts            // thread, ask, stop, cancellation refs, openEvidence
  engineering/
    use-analysis.ts        // analyze, analyzeExisting, bulk progress, alertKey
    use-source-claims.ts   // claim load/edit/delete (from SourceEngineering)
    use-open-alerts.ts     // alert load + setStatus (from EngineeringAlerts)
  auth/
    use-login-form.ts      // mode, submit, google, info/error
```

Then:
- `routes/app.tsx` becomes a thin composition: `useWorkspaces()` → `useSources(ws)` → `useChat(ws)` → `useAnalysis(...)` → render. Same UI initially.
- Presentational components (`AppShell`, `SourceEngineering`, `EngineeringAlerts`, `SourceEvidenceDrawer`) receive data/handlers via props or call the feature hooks; no Supabase imports left in `components/`.
- Radar already follows the target pattern; only move its query options into `features/radar/`.

Not in scope here: introducing a global store, changing Supabase access patterns (browser-direct vs. server fn), or swapping the design system. Behavior must remain byte-for-byte equivalent in effect, including the existing race guards.

### Target component architecture (for the redesign, after extraction)

```
src/
  routes/                      // thin: params, head, guards, compose features + screens
  features/                    // behavior (above) — protected, stable API
  ui/
    marketing/                 // NEW dark cinematic landing: Hero, Sections×5, ScrollVideo, OpenFootprintTransition
    app/                       // NEW "Stormtrooper Gray" shell: Rail, Header, ModeTabs, ChatView, SourcesPanel, RadarView, EvidenceDrawer
    legacy/                    // existing marketing pages/components kept temporarily
  styles/
    marketing.css | app.css    // scoped by a root class/data attribute, not by editing global classes
```

Route-group isolation: the landing (`/`) and app (`/app`, `/radar`) use different root wrappers (`data-theme="cinematic"` vs `data-theme="app"`) so the dark and light themes cannot bleed. The "Open Footprint" transition lives in `ui/marketing` and ends in `navigate({ to: '/app' })`; the app route's auth guard is unchanged.

## 6. Protected files (do not modify without explicit approval)

- `src/lib/ask.functions.ts`, `engineering.functions.ts`, `radar.functions.ts`, `engineering-data.ts`
- `src/integrations/supabase/**` (generated)
- `supabase/**` (config + migrations), `.env`
- `src/start.ts`, `src/server.ts`, `src/lib/error-page.ts`, `error-capture.ts`, `lovable-error-reporting.ts`
- `src/hooks/use-auth.tsx`, `src/routes/_authenticated/route.tsx`, `src/routes/__root.tsx` provider order
- `src/routeTree.gen.ts` (generated — never hand-edit; build churns its line endings, discard that diff)
- `src/test/**` (extend, don't weaken), `package.json`/`bun.lock` (no dependency changes without sign-off), `vite.config.ts`
- `AGENTS.md`, `.lovable/**`, `lovable.toml`

## 7. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| No tests on `/app` behavior; extraction could silently regress upload/ask/analyze | **High** | Phase 0 characterization tests (mock `supabase` + server fns) before any extraction; behavior-preserving moves only. |
| Race guards in `app.tsx` (`requestId`, `currentWorkspace`, `cancelled`) lost in refactor | High | Move code verbatim into hooks; test workspace switch mid-ask and stop. |
| Lint is red (CRLF + Prettier) so it can't gate PRs; running `prettier --write` would produce a huge diff and hurt Lovable sync/history readability | Medium | Don't mass-format. Fix line endings via `.gitattributes`/Prettier `endOfLine: auto` in a separate, isolated commit if approved. |
| Lovable asset URLs 404 off-platform | Medium | Rehost images (Phase 5); redesign mostly retires them. |
| Scroll-driven video: large assets, mobile autoplay limits, `prefers-reduced-motion`, SSR (`/` is SSR'd, `window` use) | Medium | Poster fallbacks, lazy load, client-only mount, reduced-motion path; host videos outside the Worker bundle. |
| Theme bleed between dark landing and gray app via global `styles.css` | Medium | Scoped theme roots; don't mutate shared class rules used by legacy pages. |
| `.env` and project ids already in git history | Low | Publishable key only; keep secrets out. |
| `@lovable.dev/vite-tanstack-config` opacity when adding video/asset handling | Low | Use `public/` for videos; avoid config changes. |
| Gemini model name `gemini-3.8-flash` hard-coded in `ask.functions.ts` (analysis uses `GEMINI_MODEL`) | Low (pre-existing) | Out of scope; flag only. Not changed. |

## 8. Phased implementation sequence

Each phase ends with: `vitest`, `tsc --noEmit`, `vite build` green, one commit on `frontend-redesign`, no rewriting of pushed history.

0. **Safety net** — add characterization tests for `/app` flows and `useAuth`/`safeRedirect`; add `.gitattributes` (`* text=auto eol=lf`) *only if approved*. No app code changes.
1. **Extract behavior** — create `src/features/*` hooks one at a time (workspace → sources → chat → analysis → engineering claims/alerts → login). `app.tsx` stays visually identical. Verify after each extraction.
2. **Decouple components** — strip Supabase calls out of `components/*`; props/hooks only. Dedupe rail vs. picker tree logic.
3. **Theme scaffolding** — scoped theme roots + tokens (`cinematic`, `app`), route-level wrappers; legacy pages unchanged.
4. **App interface (Stormtrooper Gray)** — rebuild `ui/app/*` on `features/*`; swap into `/app` and `/radar`; keep old components until parity is confirmed.
5. **Landing page** — five sections, four scroll-driven video transitions, reduced-motion/mobile fallbacks; rehost assets; keep legacy marketing routes reachable.
6. **"Open Footprint" transition** — client-only overlay animation → `/app`; auth-redirect and deep-link behavior verified.
7. **Hardening** — remove dead legacy UI that's been replaced, resolve lint baseline, optional Lovable-config decoupling.

## 9. Open questions for approval

1. Approve Phase 0 + 1 (test net and behavior extraction) as the next step?
2. OK to add `.gitattributes`/Prettier `endOfLine` to clear the CRLF lint noise (isolated commit), or leave lint alone?
3. Do you have the original illustration/logo files (Lovable `.asset.json` images are not in the repo), and where will the landing videos be hosted?
4. Is the target deployment still Lovable, or independent (Cloudflare/other)? This decides how soon Phase 5 asset rehosting and config decoupling are needed.
