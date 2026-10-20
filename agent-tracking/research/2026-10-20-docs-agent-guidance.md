# Research — 2026-10-20-docs-agent-guidance

Date: 2026-10-20. Everything below was read or run in this repo.

## Stack (from `package.json`, `vite.config.ts`, configs)

- React 18.3 + TypeScript 5.8, Vite 5.4 (SWC fast refresh), React Router 6.30, Tailwind 3.4.
- TanStack Query 5.83 provider mounted in `src/App.tsx`; **no page uses it yet**.
- shadcn/ui over Radix; `components.json` present; 27 files in `src/components/ui/`.
- Vitest 3.2 + jsdom + Testing Library; `vitest.config.ts` with the `@/` alias.
- ESLint 9 flat config (`eslint.config.js`).
- LiveKit (`@livekit/components-react`), Recharts, Framer Motion, Sonner, Lucide.

## Baseline measured today (2026-10-20)

| Command | Result |
|---|---|
| `npm run typecheck` | clean, no output |
| `npm run lint` | `✖ 82 problems (74 errors, 8 warnings)` — mostly `@typescript-eslint/no-explicit-any`, plus `tailwind.config.ts` (`no-require-imports`) and `src/components/ui` |
| `npm run test` | `Test Files 44 passed (44)`, `Tests 314 passed (314)`, 17.29 s |
| `npm run build` | not re-run (docs-only task, no source change) — last recorded in `AGENTS.md`: succeeds with a >500 kB chunk warning |

The `AGENTS.md` baseline numbers are still accurate. Only the *descriptions* of the tree are stale.

## Routes actually registered (`src/App.tsx`)

```
/                       Index (landing)
/auth                   Auth
/dashboard              → DashboardLayout
  index                 → Navigate to "assistant"
  assistant             Assistant
  tools                 Tools
  audio-library         AudioLibrary
  call-logs             CallLogs
  analytics             Analytics
  phone-number          PhoneNumber
  inbound               Inbound
  inbound-context       InboundContext
  make-call             MakeCall
  passthrough-call-records  PassthroughCallRecords
  developer             Developer            ← new, not in the README
  api-keys              → Navigate to /dashboard/developer   ← renamed route
  integration           Integrations
*                       NotFound
```

`src/routes/dashboard/navItems.ts` is the sidebar/command-palette source of truth — 12 items in 5
sections (`Get started`, `Build`, `Phone`, `History`, `Developers`). Note the labels are
**Assistants**, **Phone Numbers**, **Inbound Rules**, **Passthrough Calls**, **Your VoiceKit API
key**, **Provider Keys** — the README's "Features / Pages" table still uses the old
`API Keys` / `Integration` names.

## Real `src/` tree (from `find src -type f`)

- `src/routes/`: `Index`, `Auth`, `NotFound`, `dashboard/` (layout, sidebar, command palette,
  `navItems.ts`) plus 12 page directories.
- `src/routes/dashboard/assistant/` (the reference page): `Assistant.tsx`, `AssistantForm.tsx`,
  `AssistantChat.tsx`, `AudioChain.tsx`, `BillableMinutesLookup.tsx`, `ConfigField.tsx`,
  `FieldRow.tsx`, `GettingStarted.tsx`, `LlmSection.tsx`, `PromptEditor.tsx`, `ProviderFields.tsx`,
  `StageSection.tsx`, `SttSection.tsx`, `TemplatePicker.tsx`, `TtsSection.tsx`,
  `assistantConfig.ts`, `constants.ts`, `providerCatalog.ts`, `useAssistantList.ts`,
  `useChatTranscriptions.ts`.
- `src/services/` (16 modules): analytics, assistant, audio, auth (`authService` + `authedFetch`),
  call, inbound, inboundContext, integration, **meetingCall**, passthroughCall, sip, storage, tool,
  webCall.
- `src/lib/` (10): `apiSnippet`, `assistantModes`, `callMetadata`, `formatUrl`, `formatUsd`,
  `placeholders`, `readJson`, `toastError`, `utils`, `webhookSamples`.
- `src/hooks/` (3): `use-toast`, `useCopyToClipboard`, `usePersistedFlag`.
- `src/components/common/` (6): `ApiSnippet`, `CopyIdButton`, `EmptyState`, `JsonSample`,
  `MasterDetailShell`, `MetadataEditor`.
- `src/components/ui/` (27 shadcn primitives).
- `src/types/` (15): analytics, assistant, audio, auth, callLog, http, inbound, inboundContext,
  integration, meetingCall, passthroughCall, sip, tool (+ `vite-env.d.ts`).

`src/features/`, `src/stores/`, `src/styles/` still do not exist — correct in both docs.

## README gaps found (each becomes a fix)

1. Route table missing `/dashboard/developer`; `/dashboard/api-keys` is now a redirect, not a page.
2. "Features / Pages" table still lists **API Keys** and **Integration**; the sidebar labels them
   *Your VoiceKit API key* and *Provider Keys*.
3. Project-structure tree missing: `developer/`, `meetingCall/`, `CommandPalette.tsx`,
   `DashboardSidebar.tsx`, `navItems.ts`, the six `components/common` files, the three hooks, eight
   of the ten `lib` files, `readJson`, `toastError`, the assistant sub-files after
   `AssistantForm.tsx`, `GettingStarted`, `TemplatePicker`, `BillableMinutesLookup`, the four
   `make-call` files, and `contextStrategySamples` / `headerDiff` / `strategyValidation`.
4. "24 shadcn/ui primitives" → 27.
5. Scripts table missing `npm run build:dev`.
6. `bun.lockb` is listed but the committed lockfile is `package-lock.json` (README already says
   this in *Requirements*, but the tree lists `bun.lockb` as if it were the lockfile).
7. Naming: the product is **VoiceKit** in user-facing copy (`apiSnippet`, `Developer`, `Auth`,
   `Integrations`, `navItems`), while the sidebar, `storageService` keys, the npm package name and
   the docker-compose container name still say **INTVOICEKIT**.
8. Nothing documents the `agent-tracking/` folder or the repo-local skill pack's tracking
   convention.

## AGENTS.md gaps found

1. The "Mandatory skills" section lists only the repo-local pack; the `core-fe-*` pack installed
   globally is not registered.
2. `## Repository structure` describes the assistant page as `Assistant.tsx` + `AssistantForm.tsx` +
   `AssistantChat.tsx` + `useAssistantList.ts` + `constants.ts` — it now has 20 files, split by stage
   (`LlmSection` / `SttSection` / `TtsSection`).
3. `src/components/common/` extraction bar is stated, but the six current files are not listed.
4. `src/services/`, `src/lib/`, `src/hooks/` lists are missing `meetingCall`, `readJson`,
   `useCopyToClipboard`, `usePersistedFlag`, and the new lib helpers.
5. The `Developer` route and the `api-keys` → `developer` redirect are undocumented.
6. No mention of `agent-tracking/` or of `CLAUDE.md` importing this file.

## Sources consulted

- Repo files: `AGENTS.md`, `README.md`, `package.json`, `vite.config.ts`, `vitest.config.ts`,
  `eslint.config.js`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `.gitignore`,
  `src/App.tsx`, `src/routes/dashboard/navItems.ts`, `find src`, `find tests`, `git log`.
- Skill templates: `core-fe-workflow/templates/AGENTS.md` (the managed `core-fe` block and the
  registration rules), `core-fe-workflow/templates/INDEX.md`, `core-fe-workflow/templates/plan.md`.
