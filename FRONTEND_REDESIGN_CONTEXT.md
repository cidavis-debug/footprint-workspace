# Footprint AI — Frontend Redesign Context

Audit baseline taken on branch `redesign_claude_v2` (HEAD `d7ea106`). Purpose: let a frontend-only redesign proceed without breaking backend behavior.

## 1. Architecture overview

| Area | Finding |
|---|---|
| Framework | TanStack Start (React 19) + TanStack Router (file-based routes) + TanStack Query. Vite 8, Tailwind v4. |
| Build wrapper | `@lovable.dev/vite-tanstack-config` (adds tanstackStart, react, tailwind, tsconfig paths, nitro → Cloudflare target). Do **not** add those plugins manually. Server entry redirected to `src/server.ts`. |
| Package manager | Repo lockfile is `bun.lock` (Lovable). `bun` is not installed locally; `npm` was used (this created an untracked `package-lock.json`). |
| Backend | Supabase (Postgres + RLS + Storage bucket `sources`). No Supabase edge functions; server logic lives in TanStack `createServerFn` functions. |
| AI | Google Gemini via plain `fetch` in server functions; key from `GEMINI_API_KEY`, model from `GEMINI_MODEL` (default `gemini-3.8-flash`; `ask.functions.ts` hard-codes it). |
| Deploy | Lovable-connected; nitro build targets Cloudflare (`.output/`, generated `wrangler.json`). No hand-written deploy config. |
| Auth | Supabase email/password. `AuthProvider` (`src/hooks/use-auth.tsx`) wraps root. Client middleware in `src/start.ts` attaches the access token to server-fn calls; `requireSupabaseAuth` validates it and builds a per-request RLS-scoped client. Google OAuth code exists but is disabled (`GOOGLE_ENABLED = false`). |

### Routes

| Route | File | Notes |
|---|---|---|
| `/` , `/how-it-works`, `/pricing`, `/security`, `/collections` | `src/routes/*.tsx` | Marketing/static; use `SiteLayout`/`ContentPage`. |
| `/login` | `login.tsx` | Sign in / sign up; `safeRedirect` guard. |
| `/app` | `app.tsx` (279 lines) | **Main workspace**: everything functional lives in this one component. `ssr:false`. Search params `workspace`, `sources`. |
| `/radar` | `_authenticated/radar.tsx` | Behind `_authenticated` layout (client `getUser()` redirect). Loader uses React Query + `getRadar`. |

### Data flow

- **Direct browser → Supabase (RLS)** via `src/integrations/supabase/client.ts`: workspaces (list/create), collections (list/rename), sources (list/insert/delete/status refresh), storage uploads/removes in bucket `sources`, engineering claims (list/edit/delete), open alerts (list/status update).
- **Browser → server functions → Supabase/Gemini**:
  - `askFootprint` (`src/lib/ask.functions.ts`): loads sources/claims/open alerts (paged), builds prompt with `engineeringPrompt`, calls Gemini with JSON schema, maps `S<n>` tags to citations, validates quotes against snippets/claims, persists `conversations` + `messages`.
  - `analyzeEngineeringSource` (`engineering.functions.ts`): Gemini extraction of claims + conflict alert generation; replaces previous claims for the source; sets `engineering_analysis_status`.
  - `getRadar` / `reviewRadarAlert` (`radar.functions.ts`): workspace-scoped alerts/claims/sources; alert status → reviewed/resolved/dismissed.
- **Pure logic**: `src/lib/engineering-data.ts` (types, `filterAlerts`, `radarFilters`, `suggestedQuestions`, `engineeringPrompt`) — browser-safe, unit-tested.

### Database (migrations in `supabase/migrations/`, 6 files)

`profiles`, `workspaces` (owner + `parent_id` for sub-workspaces), `collections`, `sources`, `conversations`, `messages`, `engineering_claims`, `engineering_alerts`; RLS via `owns_workspace()`; storage policies keyed on first path segment = workspace id; triggers `handle_new_user`, `handle_new_workspace` (creates default collection). `src/integrations/supabase/types.ts` is generated.

## 2. Existing functionality inventory (verified in code)

- Email/password sign-in & sign-up, session persistence, sign-out, redirect-after-login.
- Workspaces and one level of sub-workspaces; create; switch (rail on desktop, `WorkspacePicker` on mobile); `?workspace=` deep link.
- Default collection per workspace (first collection used for new sources); rename.
- Source ingestion: file upload (PDF/MD/TXT, ≤20 MB, to storage + `sources` row; text files get snippet and `ready` immediately, PDFs stay `indexing`), http(s) link add, remove (row + storage object), search/filter in drawer.
- Engineering analysis per source, bulk "Analyze existing sources", reanalyze, per-claim edit/delete.
- AI chat scoped to active workspace: suggested questions, stop/cancel (client-side request token), per-workspace thread reset, notices for errors.
- Citations with quote verification; click → `SourceEvidenceDrawer` (uses `getRadar` for claims).
- Radar: filters (All/Interfaces/Constraints/Assumptions/Resolved), severity, evidence per alert, review/resolve/dismiss, source drawer.
- Open-alert panel in the sources drawer (`EngineeringAlerts`).
- Error capture/reporting plumbing (`error-capture.ts`, `lovable-error-reporting.ts`, `error-page.ts`).

**Not implemented / do not mock as real:** PDF text extraction (PDFs are never analyzed or cited by content), link content fetching (link sources have no snippet), Google sign-in, pricing/billing/plans, team/sharing/invites (RLS is owner-only), conversation history UI (messages are saved but never read back), notifications, real-time updates.

## 3. File boundaries

### A. Protected backend — do not change
- `supabase/**` (migrations, `config.toml`)
- `src/integrations/supabase/**` (client, server client, auth middleware, generated types, preview auth storage)
- `src/lib/ask.functions.ts`, `engineering.functions.ts`, `radar.functions.ts`
- `src/start.ts`, `src/server.ts`, `src/router.tsx`, `src/lib/error-*.ts`, `src/lib/lovable-error-reporting.ts`
- `.env`, `vite.config.ts`, `lovable.toml`, `bun.lock`, `package.json` dependency set, `tsconfig.json`
- `src/routeTree.gen.ts` (generated; regenerated automatically when route files are added/removed)

### B. Frontend logic to preserve (restyle around it, don't rewrite)
- `src/hooks/use-auth.tsx` (`AuthProvider`, `useAuth`, `safeRedirect`)
- `src/lib/engineering-data.ts` (pure helpers; covered by tests)
- Behavior inside `src/routes/app.tsx`: workspace load/switch effects with `cancelled` guards, `requestId`/`currentWorkspace` refs that discard stale answers, upload→insert→rollback-on-failure, delete row then storage object, `analyze` status refresh, `?workspace`/`?sources` search params.
- `src/routes/_authenticated/route.tsx` and the loader/query keys/mutation in `radar.tsx` (`['radar', userId, workspaceId]`, invalidate `['radar']`).
- Route `validateSearch` schemas and `ssr:false` flags; `head` metadata via `pageHead`.
- Supabase `select(...)` column lists and insert payload shapes (typed against `types.ts`).
- Login redirect/`emailRedirectTo` handling.

### C. Presentation — safe to redesign
- `src/styles.css` (395 lines of global/app CSS) and `src/design-system/**` (Apple-inspired + footprint themes, fonts, tokens)
- `src/components/ui/**` (shadcn primitives — largely unused by app pages)
- Marketing: `site-layout.tsx`, `content-page.tsx`, `brand.tsx`, `illustration.tsx`, `footprint-walk.tsx`, `ink-connectors.tsx`, `showcase-*.tsx`, `navigation-button.tsx`, and routes `index/how-it-works/pricing/security/collections.tsx`
- Visual layer of `app-shell.tsx`, `workspace-picker.tsx`, `engineering-context.tsx`, `source-evidence-drawer.tsx`, `login.tsx`, and JSX of `app.tsx`/`radar.tsx` — **only the markup/classes; keep handlers, props and state wiring**.
- `src/assets/**` (`*.asset.json` pointers), `public/`

### D. Shared files needing care
- `src/routes/app.tsx` and `radar.tsx` mix data logic and presentation in one component. Redesign by extracting presentational components that receive the existing state/handlers as props; do not move fetches.
- `src/components/app-shell.tsx`: props contract (`workspaces, value, onChange, onCreate, busy, mode, email, onSources, onSignOut`) is used by both `/app` and `/radar`. Keep the contract or update both call sites together.
- `src/components/engineering-context.tsx` and `source-evidence-drawer.tsx`: perform direct Supabase writes (claim edit/delete, alert status) — styling only.
- `src/design-system/**` components are imported by app logic with specific props (`Composer.onSend/onUpload/onAddLink`, `SourcesDrawer`, `CitationChip`, `SourceItem`); changing their prop APIs breaks `/app`.
- `AGENTS.md` (Lovable instructions) — preserve.

## 4. Hooks and services to reuse

`useAuth`, `safeRedirect`, `supabase` client, `useServerFn(askFootprint | analyzeEngineeringSource | getRadar | reviewRadarAlert)`, `filterAlerts`, `radarFilters`, `suggestedQuestions`, `engineeringPrompt`, `analysisLabel`, `SeverityBadge`, `useIsMobile`, `pageHead`.

## 5. Current test coverage

Vitest + jsdom (`npm test`): 2 files, 6 tests, all passing.
- `app-routing.test.tsx`: `/radar` resolves under `_authenticated`; `/` matches a page.
- `engineering-data.test.ts`: alert filtering/order, prompt source mapping, exclusion of un-indexed sources' claims/alerts.

**No coverage** for: auth flow, `/app` workspace switching, upload/link/remove, chat/citations, analysis, Radar review actions, server functions, RLS. Tests do not touch Supabase or Gemini.

## 6. Baseline results (this machine, npm)

| Check | Result |
|---|---|
| `npm test` | ✅ 6/6 pass |
| `npx tsc --noEmit` | ✅ no errors |
| `npm run build` | ✅ builds (client + SSR + nitro Cloudflare output) |
| `npm run lint` | ❌ 7,605 errors / 13 warnings — ~all are `prettier/prettier` "Delete `␍`" (CRLF line endings from Windows checkout vs. LF Prettier config). Pre-existing/environmental; not caused by code. Not fixed (would touch every file). |

Working tree at audit: `src/routeTree.gen.ts` shows modified (line-ending only; no content diff) and `package-lock.json` untracked (created by `npm install`; repo uses `bun.lock`). `.output/` and `.wrangler/` are build artifacts and are git-ignored.

## 7. Known risks and limitations

1. **Live end-to-end is unverified.** `roadmap.md` lists live alert actions, citation links, and cross-workspace RLS as unverified (no authenticated session available). Automated tests cannot confirm them; need a manual pass with a **test** Supabase project.
2. `.env` contains the real Supabase project URL/publishable key and `supabase/config.toml` the project id. `GEMINI_API_KEY` is not in the repo (server env only). Never point tests at these.
3. `/app` is a single 279-line component with all side effects; easy to break stale-response guards (`requestId`, `currentWorkspace`, `cancelled`) when restructuring.
4. Gemini model name `gemini-3.8-flash` is hard-coded in `ask.functions.ts`; a 404 shows a model-name error. Not a frontend concern, but explains possible "no answer" states.
5. `EngineeringAlerts` (open alerts in the sources drawer) and `SourceEngineering` perform direct RLS writes from presentational-looking components; treat them as logic-bearing when restyling.
6. PDFs remain `indexing` forever (no extractor); UI should not imply they are searchable.
7. `supabase.from('sources').insert` happens client-side after storage upload; failures between steps are handled only by a single rollback — keep that sequence.
8. Alert status is updated through two paths (direct Supabase in `EngineeringAlerts`, server fn in Radar); both must keep working.
9. Windows CRLF vs. LF may create noisy diffs; avoid mass reformatting.
10. Two stylesheets/design systems (Apple-inspired canonical + legacy Footprint token aliases) are layered; removing aliases can break specialized workspace controls (see `AGENTS.md`).
11. `package.json` has no `typecheck` script; use `npx tsc --noEmit`.

## 8. Recommended sequence for a frontend-only redesign

1. Create/confirm the redesign branch; keep `npm test`, `npx tsc --noEmit`, `npm run build` green as a gate after every step.
2. Define tokens/typography in the design-system CSS only; keep existing class/token aliases until all consumers are migrated.
3. Redesign marketing pages and `SiteLayout` (lowest risk, no data).
4. Redesign `login.tsx` markup (keep submit handler, `safeRedirect`, error/info states).
5. Redesign `AppShell`/`WorkspacePicker` (keep props contract; verify switch, create main/sub, mobile picker).
6. Extract presentational pieces from `app.tsx` (chat thread, composer dock, sources drawer, source rows) taking existing state/handlers as props; no change to effects.
7. Redesign Radar list/filters/evidence drawer around existing `update`, `filterAlerts`, query keys.
8. Add component tests for new presentational components with mocked props/handlers (no network).
9. Manual QA against a non-production Supabase project: login, workspace switch, upload/link/remove, ask + citation drawer, analyze, Radar review.
10. Final gate: tests, tsc, build, and a diff review confirming no changes under the protected list.
