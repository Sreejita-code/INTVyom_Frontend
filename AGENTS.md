# AGENTS.md

Guidance for AI coding agents working in this repository.

**This file is the single source of truth for agent rules in this repo.** `CLAUDE.md` imports it
with `@AGENTS.md` and contains nothing else — never copy a rule, a table, or a file listing into
`CLAUDE.md`; link back here instead. If a rule changes, it changes here, once.

## Project

VoiceKit — a React + TypeScript (Vite) app for managing voice AI assistants (assistants, tools,
audio library, SIP trunks, inbound routing, integrations, analytics, and passthrough web calls).
LiveKit is used for realtime voice/text chat in the browser.

The product name in the UI is **VoiceKit**. The legacy `INTVOICEKIT` spelling survives in three
identifiers that must not change casually: the npm package name (`intvoicekit-frontend`), the
Docker container name, and the `intvoicekit_*` `localStorage` keys (`intvoicekit_auth`,
`intvoicekit_onboarding_dismissed`, `intvoicekit.sidebar.collapsed`,
`intvoicekit.list.<key>`). Renaming those signs people out or drops their state.

## Mandatory skills

Skills live in `.agents/skills/<name>/SKILL.md`. **`.agents/` is the single source of truth** —
`.claude/skills/<name>` is a directory symlink into it. Edit `.agents/`, never the mirror. This
file (`AGENTS.md`) overrides any skill wherever the two disagree.

- **`plan-before-implement`** — read → baseline → audit → propose → **ask the
  user and wait** → implement one step at a time → verify. Follow it for
  anything larger than a typo.
- **`react-service-structure`** — the canonical folder layout, naming
  conventions, service `call`/`condense` contract, and README standard. Read it
  before adding a file, moving one, or deciding where something belongs.
- **`ui-design-system`** — the visual and responsive quality bar in this repo's
  tokens and utilities. Read it before any UI change.
- **`run-intvoicekit-frontend`** — launches the app and drives it in a real browser.
  Run it to see a change, screenshot a page, or sweep every route at five
  viewport widths for layout breaks. UI work is not verified until this has run.

## Workflow

Every non-trivial change (more than one file, any layout, any data fetching, any shared
component) runs this loop. Trivial work — a typo, a copy change, one class name — skips it, but
still updates the README when it touches a script, an env var, a dependency, or a folder.

1. **Read** the code and the docs you are about to change, in full. `AGENTS.md` and `README.md`
   first; `AGENTS.md` wins.
2. **Baseline** — record the current state of the thing you are changing, with commands and
   exact output. Without a baseline you cannot tell a regression from a pre-existing failure.
3. **Propose** the smallest change that fixes the cause, with the files it touches.
4. **Ask the user and wait.** Silence is not approval. A one-line "go ahead" is.
5. **Implement** one step at a time, verifying between steps. A red step is fixed before the
   next one starts.
6. **Verify** — tests, type check, lint, and (for UI) a real browser run.
7. **Sync the docs** in the same change: `README.md` and, when the layout moved, the
   `## Repository structure` section below.
8. **Report** — what changed, what you verified, what you found but did not fix.

Record the work in `agent-tracking/`:

```
agent-tracking/
├── INDEX.md                         # one row per task, status kept current
├── plans/<slug>/scope.md            # the request, as asked, plus the answers
├── plans/<slug>/plan.md             # the approved plan
├── plans/<slug>/progress.md         # the step log
├── research/<slug>.md               # what was read, measured, and ruled out
├── screenshots/<slug>/              # browser output
└── reports/<slug>.md                # the deliverable
```

Slug: `YYYY-MM-DD-<type>-<topic>`, the same slug in every folder. `README.md` and this file are
updated in the same change as the code they describe — a developer who clones the repo tomorrow
must be able to install, run, and navigate it from `README.md` alone.

## Commands

- `npm run dev` — start the Vite dev server (port 8080)
- `npm run build` — type-check (`tsc -b`) + production build
- `npm run build:dev` — development-mode build (keeps the Vite dev overlay tooling)
- `npm run typecheck` — type-check only (`src` and `tests`)
- `npm run lint` — ESLint over the repo
- `npm run test` — run Vitest once (jsdom)
- `npm run test:watch` — Vitest in watch mode
- `npx vitest run <path>` — run a single test file
- `node .agents/skills/run-intvoicekit-frontend/driver.mjs sweep` — every route at five widths

## Repository structure

- `src/routes/<route>/<Route>.tsx` + `index.ts` barrel — one directory per top-level route.
  Dashboard pages live under `src/routes/dashboard/<page>/`. **A component, hook, or
  constant used by exactly one route lives in that route's directory**, not in
  `src/components/`.
- `src/routes/dashboard/` also holds the shell: `DashboardLayout.tsx`,
  `DashboardSidebar.tsx`, `CommandPalette.tsx` (⌘K), and `navItems.ts` — the single source of
  truth for sidebar labels, helpers, keywords, and paths.
- `src/components/ui/` — 27 shadcn/ui primitives, vendored by the shadcn CLI. Presentational
  only; treat as third-party. Filenames are kebab-case because the CLI generates them.
- `src/components/common/` — app-aware but domain-agnostic components, shared by 3 or more
  routes: `MasterDetailShell`, `EmptyState`, `CopyIdButton`, `ApiSnippet`, `JsonSample`,
  `MetadataEditor`. **Extraction bar: used by 3 or more routes.** Two copies is not duplication
  worth an abstraction.
- `src/services/<upstream>/<upstream>Service.ts` — one module per backend API domain:
  `analytics`, `assistant`, `audio`, `auth` (`authService` + `authedFetch`), `call`, `inbound`,
  `inboundContext`, `integration`, `meetingCall`, `passthroughCall`, `sip`, `tool`, `webCall`,
  plus `storage/storageService.ts` (browser storage). Each service exports:
  - `call<X>Endpoint(...)` — performs the `fetch` against `import.meta.env.VITE_BACKEND_URL`,
    returns `{ ok, json }` (`ServiceResponse<unknown>` in `src/types/http.ts`) or throws on failure
    for mutation endpoints.
  - `condense<X>Response(json)` — normalizes a raw API payload into typed domain shapes.
- **LiveKit is the exception to `call`/`condense`.** Realtime room sessions are not
  request/response. `src/services/webCall/webCallService.ts` mints the token via the
  normal pair; the room lifecycle itself is driven by `@livekit/components-react`
  inside the routes that need it (`assistant`, `make-call`).
- `src/types/` — one module per domain (analytics, assistant, audio, auth, callLog, http,
  inbound, inboundContext, integration, meetingCall, passthroughCall, sip, tool).
- `src/lib/` — pure helpers only: `apiSnippet`, `assistantModes`, `callMetadata`, `formatUrl`,
  `formatUsd`, `placeholders`, `readJson`, `toastError`, `utils`, `webhookSamples`. No fetch
  calls, no `localStorage`, no `import.meta.env`.
- `src/hooks/` — hooks shared by two or more routes or shells: `use-toast`, `useCopyToClipboard`,
  `usePersistedFlag`. Single-route hooks live with their route.
- Browser storage access lives in `src/services/storage/storageService.ts` (`getStoredUser`,
  `storeUser`, `clearUser`).
- `tests/` — Vitest suites at the repo root, mirroring source paths
  (e.g. `tests/routes/dashboard/analytics/Analytics.test.tsx`).
- `agent-tracking/` — scope, plan, research, screenshots, and reports for agent work.

`src/routes/dashboard/assistant/` is the reference for how a large page is split:
`Assistant.tsx` composes, `AssistantForm.tsx` renders the editor body, `LlmSection.tsx`,
`SttSection.tsx` and `TtsSection.tsx` are the stage sections on the rail, `StageSection.tsx`
and `FieldRow.tsx` draw one stage and one control row, `ConfigField.tsx` and
`ProviderFields.tsx` render a provider spec, `providerCatalog.ts` holds every provider, model and
field spec, `assistantConfig.ts` is the pure form ⇄ API translation, `AssistantChat.tsx` owns the
LiveKit chat modal, `useAssistantList.ts` owns list pagination, and `constants.ts` holds the static
option lists. `AssistantForm.tsx` is deliberately left as one file — its sections all write
through the same `setFormData`, so splitting it would mean threading five updater functions
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
- **No two files in one directory may differ only in case** (`Index.tsx` next to `index.ts`,
  `webCallClientGuide.ts` next to `WebCallClientGuide.tsx`). On a case-insensitive filesystem the
  bundler and `tsc` resolve the wrong one; that is why the landing page is `IndexPage.tsx` and the
  web-call guide data is `webCallGuideSteps.ts`.
- No behavior changes when refactoring: swapping inline `fetch` calls for service functions
  must preserve the exact request shape and error handling.
- Type all API payloads through `src/types/`; services own the `call`/`condense` pattern.
- **Identity is the bearer key.** Authenticated services call `authedFetch`
  (`src/services/auth/authedFetch.ts`), which attaches `Authorization: Bearer <api_key>` from the
  stored session and clears it (returning to `/auth`) on `401`. `login`/`signup` use plain `fetch`.
  Never send `user_id` — the backend ignores it. Pages gate requests on `user?.api_key`.
- Services read response bodies with `readJson` (`src/lib/readJson.ts`), never `res.json()`, so a
  proxy's HTML error page becomes `{ error }` rather than a `SyntaxError`.
- **A moved route gets a redirect, not a 404.** `/dashboard/api-keys` now points at
  `/dashboard/developer`; keep the old path in `src/App.tsx` as a `<Navigate>`.
- Keep comment style consistent with existing code; do not add new comments unless they
  document non-obvious backend behavior.
- No dead code. Delete unused components and dependencies rather than keeping them
  "just in case" — git history is the safety net.
- This repo intentionally has no license file; do not add one.

## Baseline

Pre-existing, not regressions — compare against these before claiming a
regression. Measured 2026-09-12; refreshed 2026-09-22 (after the API-contract alignment work)
and again on 2026-10-21 (after `agent-tracking/plans/2026-10-21-feature-gemini-duplex-cost-sync`).

- `npm run test` — 49 files, 416 tests, all pass. `tests/lib/apiSnippet.test.ts > renders
  Python the interpreter compiles` skips its check where `python3` is not installed.
- `npm run typecheck` — clean on any filesystem (the two case collisions that used to break
  Windows checkouts were fixed on 2026-09-22).
- `npm run lint` — 82 problems (74 errors, 8 warnings), almost all
  `@typescript-eslint/no-explicit-any` spread across routes, plus
  `tailwind.config.ts` and `src/components/ui`
- `npm run build` — `tsc -b && vite build`; succeeds, emits a >500 kB chunk warning
  (~1.90 MB main bundle).
- `node .agents/skills/run-intvoicekit-frontend/driver.mjs sweep` — 0 failing
  checks across 15 routes × 5 widths. Off-origin calls are stubbed with `200`, so the seeded
  session's `api_key` is never validated by a real backend.
