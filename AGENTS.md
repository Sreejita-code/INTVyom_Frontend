# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

INTVyom frontend — a React + TypeScript (Vite) app for managing voice AI assistants
(assistants, tools, audio library, SIP trunks, inbound routing, integrations, analytics,
and passthrough web calls). LiveKit is used for realtime voice/text chat in the browser.

## Mandatory skills

- **`react-service-structure`** (`.agents/skills/react-service-structure/SKILL.md`) —
  the canonical folder layout, naming conventions, and README standard. Read it before
  adding a file, moving one, or deciding where something belongs. This file (`AGENTS.md`)
  overrides it wherever the two disagree.
- `.claude/skills/*.md` are symlinks to `.agents/skills/<name>/SKILL.md`. `.agents/` is the
  single source of truth — edit there, never the mirror.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) + production build
- `npm run typecheck` — type-check only (`src` and `tests`)
- `npm run lint` — ESLint over the repo
- `npm run test` — run Vitest once (jsdom)
- `npx vitest run <path>` — run a single test file

## Repository structure

- `src/routes/<route>/<Route>.tsx` + `index.ts` barrel — one directory per top-level route.
  Dashboard pages live under `src/routes/dashboard/<page>/`. **A component, hook, or
  constant used by exactly one route lives in that route's directory**, not in
  `src/components/`.
- `src/components/ui/` — shadcn primitives, vendored by the shadcn CLI. Presentational
  only; treat as third-party. Filenames are kebab-case because the CLI generates them.
- `src/components/common/` — app-aware but domain-agnostic components (layout shells,
  spinners, empty states). **Extraction bar: used by 3 or more routes.** Two copies is
  not duplication worth an abstraction.
- `src/services/<upstream>/<upstream>Service.ts` — one module per backend API domain.
  Each service exports:
  - `call<X>Endpoint(...)` — performs the `fetch` against `import.meta.env.VITE_BACKEND_URL`,
    returns `{ ok, json }` (`ServiceResponse<unknown>` in `src/types/http.ts`) or throws on failure
    for mutation endpoints.
  - `condense<X>Response(json)` — normalizes a raw API payload into typed domain shapes.
- **LiveKit is the exception to `call`/`condense`.** Realtime room sessions are not
  request/response. `src/services/webCall/webCallService.ts` mints the token via the
  normal pair; the room lifecycle itself is driven by `@livekit/components-react`
  inside the routes that need it (`assistant`, `make-call`).
- `src/types/` — one module per domain (auth, assistant, tool, audio, sip, inbound, analytics, ...).
- `src/lib/` — pure helpers only (e.g. `cn`, `toastError`). No fetch calls, no `localStorage`,
  no `import.meta.env`.
- Browser storage access lives in `src/services/storage/storageService.ts` (`getStoredUser`,
  `storeUser`, `clearUser`).
- `src/hooks/` — hooks reused by two or more routes. Single-route hooks live with their route.
- `tests/` — Vitest suites at the repo root, mirroring source paths
  (e.g. `tests/routes/dashboard/analytics/Analytics.test.tsx`).

`src/routes/dashboard/assistant/` is the reference for how a large page is split:
`Assistant.tsx` composes, `AssistantForm.tsx` renders the editor body,
`AssistantChat.tsx` owns the LiveKit chat modal, `useAssistantList.ts` owns list
pagination, and `constants.ts` holds the static option lists. `AssistantForm.tsx`
is deliberately left as one file — its sections all write through the same
`setFormData`, so splitting it would mean threading five updater functions
through five components for no gain.

`src/features/`, `src/stores/`, and `src/styles/` do not exist yet, on purpose. Global CSS
is `src/index.css`. Add those layers when a real need arrives, not before.

## Conventions

- **Imports use the `@/` alias** (`@/components/ui/button`), never deep relative paths.
  Same-directory relative imports (`./constants`) are fine.
- **Barrels only in `src/routes/<route>/index.ts`.** Nowhere else.
- **File naming**: `PascalCase.tsx` for components, `camelCase.ts` for hooks/services/types/
  helpers, `kebab-case.tsx` inside `src/components/ui/` only. No `utils.ts` dumping grounds —
  `src/lib/utils.ts` is grandfathered in for `cn`; name new helper files after what they do.
- No behavior changes when refactoring: swapping inline `fetch` calls for service functions
  must preserve the exact request shape and error handling.
- Type all API payloads through `src/types/`; services own the `call`/`condense` pattern.
- Keep comment style consistent with existing code; do not add new comments unless they
  document non-obvious backend behavior.
- No dead code. Delete unused components and dependencies rather than keeping them
  "just in case" — git history is the safety net.
- This repo intentionally has no license file; do not add one.

## Baseline

Pre-existing, not regressions — compare against these before claiming a regression:

- `npm run test` — 5 files, 22 tests pass, no errors
- `npm run typecheck` — clean
- `npm run lint` — 52 problems (45 errors, 7 warnings), almost all
  `@typescript-eslint/no-explicit-any` spread across routes, plus
  `tailwind.config.ts` and `src/components/ui`
- `npm run build` — succeeds; emits a >500 kB chunk warning (~1.73 MB main bundle)
