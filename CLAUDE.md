# Footprint AI — Project Instructions

Existing `AGENTS.md` (Lovable notes, Radar/chat/theme conventions) still applies; read it first. Detailed audit: `FRONTEND_REDESIGN_CONTEXT.md`.

## Stack
TanStack Start + Router + Query, React 19, Vite 8, Tailwind v4, Supabase (RLS + Storage), Gemini via server functions. Lovable-connected; `bun.lock` is the committed lockfile (local checks have used `npm`).

## Rules
- **Preserve backend functionality.** The redesign is frontend-only.
- **Do not modify database schema or migrations** (`supabase/**`) without explicit approval.
- **Do not alter authentication behavior** (`use-auth.tsx`, `src/integrations/supabase/**`, `src/start.ts`, `_authenticated` layout, login redirects).
- **Preserve workspace, ingestion, chat, citation, and Radar workflows**: workspace/sub-workspace switching, upload/link/remove, ask + citations + evidence drawer, source analysis, Radar filters and review/resolve/dismiss.
- Do not touch `src/lib/*.functions.ts`, `src/server.ts`, `.env`, `vite.config.ts`, `lovable.toml`, or generated files (`routeTree.gen.ts`, `types.ts`).
- **Do not invent unsupported integrations or features** (no PDF extraction, billing, team sharing, Google sign-in, or history UI unless backed by existing code).
- Keep frontend changes isolated and testable: prefer presentational components that receive existing state/handlers as props; keep effects, stale-response guards (`requestId`, `currentWorkspace`, `cancelled`), query keys, and Supabase column lists intact.
- Keep prop contracts of `AppShell` and `src/design-system/**` components in sync with all call sites.
- Never point tests or scripts at production Supabase or Gemini; mock them.
- Work only on the active redesign branch (`redesign_claude_v2` unless told otherwise). Do not merge, force-push, or rewrite pushed history; do not push unless asked.
- Avoid mass reformatting (CRLF/LF noise); `npm run lint` is known-noisy from line endings.

## Verification after changes
```
npm test
npx tsc --noEmit
npm run build
```
Baseline (before redesign): all three pass; lint fails only on pre-existing CRLF prettier errors.
