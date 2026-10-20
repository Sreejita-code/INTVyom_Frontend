# VoiceKit Frontend

React + Vite frontend for the VoiceKit AI voice assistant dashboard. Manages assistants, phone numbers, call logs, analytics, integrations, and audio libraries with a dark neon-cyber UI.

> **Naming.** The product is **VoiceKit**. The legacy `INTVOICEKIT` spelling survives in three
> identifiers that are not safe to rename casually: the npm package name
> (`intvoicekit-frontend`), the Docker container name, and the `intvoicekit_*` `localStorage`
> keys (`intvoicekit_auth`, `intvoicekit_onboarding_dismissed`,
> `intvoicekit.sidebar.collapsed`). Renaming the storage keys signs people out and drops their
> saved session and UI preferences.

## Requirements

- **Node.js** 20 or newer (Vite 5 + Vitest 3)
- **npm** — `package-lock.json` is the committed lockfile (a stale `bun.lockb` is
  also present; npm is what CI and `Dockerfile` use)
- **Browsers** — modern evergreen only; the build targets ES2020

## Tech Stack

| Category | Libraries |
|---|---|
| **Framework** | React 18, TypeScript 5, Vite 5 (SWC fast-refresh) |
| **Routing** | React Router v6 (nested layout routes) |
| **Data Fetching** | Plain `fetch` behind `src/services/` — TanStack Query is mounted in `App.tsx` but not yet used by any page |
| **Forms** | Controlled React state — no form library |
| **Styling** | Tailwind CSS 3.4, `tailwindcss-animate`, `tailwind-merge` + `clsx` |
| **UI Components** | shadcn/ui (27 Radix-based primitives) |
| **Charts** | Recharts |
| **Animation** | Framer Motion |
| **Real-time Voice** | LiveKit (`@livekit/components-react`) |
| **Notifications** | Sonner |
| **Icons** | Lucide React |
| **Date Handling** | date-fns, react-day-picker |
| **Testing** | Vitest + Testing Library + jsdom |
| **Linting** | ESLint 9 (flat config) + typescript-eslint |

## Architecture & Routing

Routes are defined in `src/App.tsx` using a nested layout pattern:

```
/                          → Landing page (Index)
/auth                      → Login / Authentication

/dashboard                 → DashboardLayout (sidebar shell)
  /dashboard               → Redirects to /dashboard/assistant
  /dashboard/assistant     → AI assistant configuration
  /dashboard/tools         → Tools & utilities
  /dashboard/audio-library → Audio file library
  /dashboard/call-logs     → Call history logs
  /dashboard/analytics     → Charts and metrics
  /dashboard/phone-number  → Phone number management
  /dashboard/inbound       → Inbound route configuration
  /dashboard/inbound-context → Inbound context rules
  /dashboard/make-call     → Make an outbound call
  /dashboard/passthrough-call-records → Passthrough call records
  /dashboard/developer     → Your VoiceKit API key, request snippets, web-call guide
  /dashboard/api-keys      → Redirects to /dashboard/developer (renamed route)
  /dashboard/integration   → Third-party provider keys (Gemini API keys, etc.)

*                          → 404 Not Found
```

A renamed page keeps its old path as a redirect (`<Navigate>` in `src/App.tsx`) rather than a 404,
so old bookmarks and screenshots keep working. `/dashboard/api-keys` is the current example.

The `DashboardLayout` (`src/routes/dashboard/DashboardLayout.tsx`) provides:
- Collapsible sidebar navigation (desktop), fed by `src/routes/dashboard/navItems.ts`
- Sheet-based navigation (mobile, < 768px)
- Command palette (`⌘K`, `src/routes/dashboard/CommandPalette.tsx`) over the same nav items
- User avatar + logout
- Watermark background
- `<Outlet />` for nested route content

## Project Structure

The canonical layout is defined by the `react-service-structure` skill; `AGENTS.md`
records this repo's deviations from it.

```
INTVyom_Frontend/
├── AGENTS.md                     # Repo rules for AI coding agents — read first
├── CLAUDE.md                     # One line: "@AGENTS.md" — imports the rules, never copies them
├── .agents/skills/               # Agent skill definitions (single source of truth)
│   ├── plan-before-implement/SKILL.md     # Read → baseline → propose → ask → implement
│   ├── react-service-structure/SKILL.md   # Canonical folder layout + README standard
│   ├── ui-design-system/SKILL.md          # Visual + responsive quality bar
│   └── run-intvoicekit-frontend/              # SKILL.md + driver.mjs (Playwright)
├── .claude/skills/               # Directory symlinks into .agents/skills/ — never edit directly
├── agent-tracking/               # Scope, plan, research, screenshots and reports per agent task
│   ├── INDEX.md
│   ├── plans/<slug>/             # scope.md, plan.md, progress.md
│   ├── research/<slug>.md
│   └── reports/<slug>.md
├── public/                       # Static assets (served as-is)
│   ├── logos/                    # TTS provider logos (cartesia, elevenlabs, sarvam)
│   ├── robots.txt                # Crawler allowlist
│   └── placeholder.svg
├── src/                          # Application source
│   ├── routes/                   # One directory per top-level route, with a barrel index.ts
│   │   ├── Index/                # Landing page (IndexPage.tsx)
│   │   ├── Auth/                 # Login / signup page
│   │   ├── NotFound/             # 404 page
│   │   └── dashboard/            # App shell + nested pages
│   │       ├── DashboardLayout.tsx  # Sidebar shell + mobile nav
│   │       ├── DashboardSidebar.tsx # Sidebar items, sections, user menu
│   │       ├── CommandPalette.tsx    # ⌘K palette over navItems.ts
│   │       ├── navItems.ts           # Sidebar labels, helpers, keywords, paths
│   │       ├── assistant/        # Assistant editor — split into:
│   │       │                     #   Assistant.tsx (page), AssistantForm.tsx (editor body),
│   │       │                     #   LlmSection/SttSection/TtsSection.tsx (the rail),
│   │       │                     #   StageSection.tsx + FieldRow.tsx (one stage, one row),
│   │       │                     #   ConfigField.tsx, ProviderFields.tsx (spec renderers),
│   │       │                     #   AudioChain.tsx (the chain diagram),
│   │       │                     #   PromptEditor.tsx, TemplatePicker.tsx, GettingStarted.tsx,
│   │       │                     #   BillableMinutesLookup.tsx,
│   │       │                     #   providerCatalog.ts (all providers), assistantConfig.ts,
│   │       │                     #   AssistantChat.tsx (LiveKit chat modal),
│   │       │                     #   useAssistantList.ts, useChatTranscriptions.ts, constants.ts
│   │       ├── tools/            # Tools & utilities (+ staticReturn.ts, toolWebhookSample.ts)
│   │       ├── audio-library/    # Audio file library
│   │       ├── call-logs/        # Call history — CallLogs.tsx + CallLogCost.tsx
│   │       ├── analytics/        # Dashboard analytics & charts
│   │       ├── phone-number/     # Phone number management
│   │       ├── inbound/          # Inbound route config (+ InboundNumberPicker.tsx)
│   │       ├── inbound-context/  # Inbound context rules (+ HeaderEditor, StrategyRow,
│   │       │                     #   contextStrategySamples, headerDiff, strategyValidation)
│   │       ├── integrations/     # Third-party provider keys
│   │       ├── make-call/        # Outbound call interface (+ MeetingCallTab.tsx, meetingUrl.ts)
│   │       ├── passthrough-call-records/  # Passthrough call records
│   │       └── developer/        # Your VoiceKit API key + request snippets
│   │                             #   (Developer.tsx, WebCallClientGuide.tsx,
│   │                             #    developerActions.ts, webCallGuideSteps.ts)
│   ├── services/                 # One module per backend API domain (call/condense pattern)
│   │   ├── analytics/analyticsService.ts
│   │   ├── assistant/assistantService.ts
│   │   ├── tool/toolService.ts
│   │   ├── audio/audioService.ts
│   │   ├── sip/sipService.ts
│   │   ├── inbound/inboundService.ts
│   │   ├── inboundContext/inboundContextService.ts
│   │   ├── integration/integrationService.ts
│   │   ├── meetingCall/meetingCallService.ts
│   │   ├── passthroughCall/passthroughCallService.ts
│   │   ├── call/callService.ts
│   │   ├── webCall/webCallService.ts
│   │   ├── auth/authService.ts
│   │   ├── auth/authedFetch.ts         # fetch + Authorization: Bearer <api_key>, 401 → /auth
│   │   └── storage/storageService.ts   # localStorage helpers (getStoredUser, etc.)
│   ├── types/                    # One module per domain (http, auth, assistant, callLog, ...)
│   ├── components/
│   │   ├── common/               # App-aware, domain-agnostic; shared by 3+ routes
│   │   │   ├── MasterDetailShell.tsx   # Two-pane list/detail layout with mobile toggle
│   │   │   ├── EmptyState.tsx          # "Nothing selected yet" detail-pane panel
│   │   │   ├── CopyIdButton.tsx        # Copy-to-clipboard button
│   │   │   ├── ApiSnippet.tsx          # Copyable API request snippet
│   │   │   ├── JsonSample.tsx          # Sample JSON payload block
│   │   │   └── MetadataEditor.tsx      # Call metadata rows + raw JSON toggle
│   │   └── ui/                   # 27 shadcn/ui primitives (button, card, dialog,
│   │                             #   table, select, tooltip, toast, ...) — CLI-generated
│   ├── hooks/
│   │   ├── use-toast.ts          # Toast notification reducer
│   │   ├── useCopyToClipboard.ts # Clipboard write with a "copied" window
│   │   └── usePersistedFlag.ts   # Boolean flag kept in localStorage
│   ├── lib/
│   │   ├── utils.ts              # cn() (clsx + tailwind-merge)
│   │   ├── readJson.ts           # res.json() → { error } instead of a SyntaxError
│   │   ├── toastError.ts         # Turn an API error into a toast message
│   │   ├── formatUsd.ts          # parse/format estimated USD costs from the API
│   │   ├── formatUrl.ts          # Pretty-print a URL for display
│   │   ├── apiSnippet.ts         # Build the copyable request snippets
│   │   ├── assistantModes.ts     # Per-mode copy and accent classes
│   │   ├── callMetadata.ts       # Metadata payload helpers
│   │   ├── placeholders.ts       # extractPlaceholders / expandDottedKeys
│   │   └── webhookSamples.ts     # Sample webhook payloads
│   ├── App.tsx                   # Root component (providers + routes)
│   ├── index.css                 # Tailwind directives + design tokens
│   ├── main.tsx                  # Application entry point
│   └── vite-env.d.ts             # Vite type declarations
├── tests/                        # Vitest suites, mirroring source paths
│   ├── setup.ts                  # Test env setup (matchMedia, ResizeObserver mocks)
│   ├── components/common/        # MasterDetailShell, EmptyState, JsonSample, CopyIdButton
│   ├── hooks/                    # usePersistedFlag
│   ├── lib/                      # apiSnippet, callMetadata, formatUrl, formatUsd,
│   │                             #   placeholders, readJson
│   ├── routes/                   # Auth, dashboard shell, and one directory per page
│   └── services/                 # One suite per service module
├── dist/                         # Production build output
├── Dockerfile                    # Multi-stage: Node build → nginx serve
├── docker-compose.yml            # Single frontend service
├── nginx.conf                    # SPA fallback to index.html
├── deploy.sh                     # git pull + docker compose up -d --build
├── .env                          # Live env vars (git-ignored)
├── .env.example                  # Env var template
├── package.json
├── package-lock.json             # Committed lockfile (npm)
├── bun.lockb                     # Stale Bun lockfile — not used by CI or Docker
├── components.json               # shadcn/ui configuration
├── tailwind.config.ts            # Tailwind theme (neon colors, animations)
├── postcss.config.js             # Tailwind + Autoprefixer
├── tsconfig.json                 # Root TS config (project references)
├── tsconfig.app.json             # TS config for src/ and tests/
├── tsconfig.node.json            # TS config for Vite configs
├── vite.config.ts                # Vite bundler config (@ alias → ./src, port 8080)
├── vitest.config.ts              # Vitest config (jsdom, path alias)
└── eslint.config.js              # ESLint flat config
```

## Service Layer

All backend communication flows through `src/services/<upstream>/<upstream>Service.ts`. Each
module exports:

- `call<X>Endpoint(...)` — performs the `fetch` against `VITE_BACKEND_URL` and returns
  `{ ok, json }` (`ServiceResponse<unknown>`), or throws on failure for mutation endpoints.
- `condense<X>Response(json)` — normalizes the raw API payload into typed domain shapes
  (`src/types/`), so pages never read response envelopes directly.

Authenticated services call `authedFetch` (see **Authentication** below) rather than `fetch`
directly, and read bodies with `readJson` (`src/lib/readJson.ts`), which turns a non-JSON error page
into `{ error }` instead of throwing. Pages import service functions only — no inline `fetch` calls live in `src/routes/`.
Browser storage access (`getStoredUser`, `storeUser`, `clearUser`) lives in
`src/services/storage/storageService.ts`.

**LiveKit is the exception.** A realtime room is a long-lived session, not a
request/response pair, so it does not fit `call`/`condense`.
`webCall/webCallService.ts` mints the token via the normal pair; the room lifecycle
itself is driven by `@livekit/components-react` inside the `assistant` and
`make-call` routes.

## Authentication

Identity is the **API key** issued at signup and returned by `POST /api/auth/login` and
`POST /api/auth/signup` as `user.api_key`. The client stores it with the rest of the session in
`localStorage["intvoicekit_auth"]` and sends it on every authenticated request as
`Authorization: Bearer <api_key>`.

- Every authenticated service calls `authedFetch` (`src/services/auth/authedFetch.ts`) instead of
  `fetch`. It attaches the stored key and, on a `401`, clears the session and redirects to `/auth`.
- `login` and `signup` use plain `fetch` — they are how the key is obtained, and their `401` means
  "wrong password", not "session expired".
- No request sends `user_id`; the backend ignores it. The stored `user_id` is kept only as an account
  reference on the Developer page.
- A signup that returns `api_key: null` (upstream key issuance failed) does not start a session.
- The API never returns TTS/STT provider keys or SIP trunk credentials. Trunk responses carry an
  allow-list of non-secret `trunk_config` keys (address, numbers, Exotel number, SIP overrides), and
  `GET /api/integration/get` returns only a `***1234` preview of a stored provider key.

## Features / Pages

| Page | Route | Description |
|---|---|---|
| **Make a Call** | `/dashboard/make-call` | Initiate an outbound AI voice call, a passthrough call, or join a meeting |
| **Assistants** | `/dashboard/assistant` | Configure AI assistant (realtime, pipeline, cascade or duplex mode) |
| **Tools** | `/dashboard/tools` | Utility tools and actions |
| **Audio Library** | `/dashboard/audio-library` | Upload and manage audio files |
| **Call Logs** | `/dashboard/call-logs` | Browse call history, recordings, and estimated USD cost |
| **Analytics** | `/dashboard/analytics` | Usage metrics, charts, and breakdowns |
| **Phone Numbers** | `/dashboard/phone-number` | Manage purchased phone numbers |
| **Inbound Routes** | `/dashboard/inbound` | Configure inbound call routing |
| **Inbound Rules** | `/dashboard/inbound-context` | Look up caller details before the assistant answers |
| **Passthrough Calls** | `/dashboard/passthrough-call-records` | Calls where a person, not an assistant, spoke to the caller |
| **Your VoiceKit API key** | `/dashboard/developer` | The key your own code sends, request snippets, and the web-call guide |
| **Provider Keys** | `/dashboard/integration` | Keys for voice and model providers (OpenAI, Gemini, ElevenLabs, ...) |

The sidebar labels in `src/routes/dashboard/navItems.ts` are the source of truth for these names;
`/dashboard/api-keys` redirects to `/dashboard/developer`.

## The Developer page

`/dashboard/developer` is where a developer finds the credential their own code sends:

- **Your VoiceKit API key** — the `api_key` issued at signup, shown masked, with a "show my real
  key" toggle and a copy button. The copy button in the snippet is a deliberate footgun: it swaps
  the placeholder for the live key, and the UI says so before it does.
- **Copyable request snippets** — every action the dashboard performs, shown as a real HTTP
  request (`src/lib/apiSnippet.ts`).
- **Web-call guide** — how to receive a web call in the browser, step by step
  (`WebCallClientGuide.tsx` + `webCallGuideSteps.ts`).

## Design System

- **Theme:** Dark mode only with HSL CSS variables defined in `src/index.css`
- **Primary:** Teal/cyan (`hsl(172 66% 50%)`) with neon glow effects
- **Background:** Very dark slate (`hsl(222 47% 6%)`)
- **Components:** 27 shadcn/ui primitives in `src/components/ui/`, plus six shared components in
  `src/components/common/` (`MasterDetailShell`, `EmptyState`, `CopyIdButton`, `ApiSnippet`,
  `JsonSample`, `MetadataEditor`)
- **CSS Utilities:** `neon-border`, `neon-glow`, `glass` (frosted glass), `watermark`, `status-chip`, `page-shell`, `page-padding`, `content-max`
- **Animations:** `accordion-down`, `accordion-up`, `pulse-neon` (Tailwind config)
- **Font:** System font stack with Inter

## State Management

There is no global state library and no `src/stores/`, on purpose.

- **Route-local `useState`** owns everything a page needs. Pages are independent;
  nothing is shared across routes at runtime.
- **The signed-in user** is the one piece of cross-route state, and it lives in
  `localStorage` behind `src/services/storage/storageService.ts` — read with
  `getStoredUser()` wherever it is needed, never mirrored into a context.
- **Server data is refetched, not cached.** Each page fetches on mount through its
  service module. TanStack Query's provider is mounted in `App.tsx` but no page
  uses it yet.

Add a store only when two routes must stay in sync live. Until then, the extra
layer buys nothing.

## Local Development

```bash
npm install
npm run dev
```

Dev server runs on `http://localhost:8080` (configured in `vite.config.ts`).

> **Path Alias:** `@/` maps to `./src/` (e.g., `import { cn } from "@/lib/utils"`)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Type-check (`tsc -b`) then production build to `dist/` |
| `npm run build:dev` | Development-mode build (keeps the Vite dev overlay tooling) |
| `npm run typecheck` | Type-check only, no build output |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |

## Environment Variables

Create a `.env` file in the root:

```env
VITE_BACKEND_URL=https://your-api-domain
VITE_LIVEKIT_URL=wss://your-livekit-domain
APP_PORT=3000
```

> `.env` is git-ignored — never commit real secrets. This table must stay in sync
> with `.env.example`.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_BACKEND_URL` | — (required) | Backend API base URL |
| `VITE_LIVEKIT_URL` | — (required) | LiveKit WebSocket server URL |
| `APP_PORT` | `3000` | Docker host port mapping |

## Testing

- **Framework:** Vitest 3 with jsdom environment
- **Globals enabled,** path alias `@/` configured
- **Setup file:** `tests/setup.ts` (mocks `matchMedia`, `ResizeObserver`)
- **Pattern:** `tests/**/*.{test,spec}.{ts,tsx}` (mirrors source paths)

```bash
npm run test         # Run once
npm run test:watch   # Watch mode
```

### Browser checks

`.agents/skills/run-intvoicekit-frontend/driver.mjs` boots the dev server and drives
the app with Playwright: it signs itself in, stubs the backend, and visits every
route at 375 / 768 / 1024 / 1440 / 1920 px, failing on horizontal overflow or
console errors. Screenshots land in `.artifacts/screens/` (gitignored).

```bash
npx playwright install chromium                                  # once per machine
node .agents/skills/run-intvoicekit-frontend/driver.mjs sweep        # every route
node .agents/skills/run-intvoicekit-frontend/driver.mjs route /dashboard/analytics
node .agents/skills/run-intvoicekit-frontend/driver.mjs shot /dashboard/tools 375
```

## Assistant Editor

`/dashboard/assistant` draws the audio path as a chain that **redraws when the mode changes**, then
renders only the stages that mode actually runs. The four modes have different *shapes*, not just
different settings, so nothing is drawn greyed-out to stand in for a stage that does not exist:

| Mode | Chain | Stages rendered |
|---|---|---|
| `realtime` | Caller → model (hears, thinks, speaks) → Caller | Realtime model only |
| `pipeline` | Caller → realtime model → voice → Caller, with a transcript tap hanging off the model | Realtime model (with the tap nested inside it), then Voice |
| `cascade` | Caller → transcriber → text model → voice → Caller | All three, numbered 1–3 |
| `duplex` | Caller ↔ GPT-Live (hears and speaks at once), with the backend model hanging off it | Voice model only |

The pipeline distinction is the one worth keeping straight: its transcriber is a **parallel tap**.
The realtime model hears the caller's audio directly; the tap only decides what the saved transcript
says. Drawing it as a fourth box in the row would read as a cascade, so it is drawn as a branch.

### Where the knobs live

| File | Holds |
|---|---|
| `providerCatalog.ts` | Every provider, model ID, language list and field spec, plus the `help` / `warn` copy shown under each control. Adding a provider is one entry here. |
| `assistantConfig.ts` | Pure form ⇄ API translation: `hydrateForm`, `buildAssistantPayload`, and the `applyModeChange` / `applySttProvider` / `applyTtsProvider` repairs. |
| `LlmSection.tsx` / `SttSection.tsx` / `TtsSection.tsx` | The three stage sections on the rail. Each one decides which providers and fields its stage offers, and hands the result to `StageSection`. |
| `StageSection.tsx` | One stage on the rail (or, with `nested`, a side channel hanging off the stage above), with its live summary chips and Advanced accordion. Also exports `TRIGGER_ONE_LINE`. |
| `FieldRow.tsx` | One labelled control row — label and help beside the control, or `wide` for values that are long by nature. |
| `ConfigField.tsx` / `ProviderFields.tsx` | Render a spec against a stored config. One level of nesting is supported, for ElevenLabs `voice_settings`. |
| `AudioChain.tsx` | The chain diagram. Presentational only — it reads the same values the stages do. |
| `PromptEditor.tsx` | System prompt, opening line, and the `{{placeholders}}` they ask for. |
| `TemplatePicker.tsx` / `GettingStarted.tsx` | Start-from-a-template (a new assistant is then created through `POST /templates/{id}/apply`) and the empty-state guide. |
| `WizardProgress.tsx` | Create-mode panel over the `/wizard/*` helper endpoints: steps, completion, rules and a per-step check. Advisory; it never writes to the form. |
| `src/lib/assistantModes.ts` | Mode copy and the per-mode accent classes. Every mode chip in the app reads from here. |
| `src/lib/placeholders.ts` | `extractPlaceholders` / `expandDottedKeys`, shared by the editor and the call pages. |

**Fields whose values are long by nature get `wide` on `FieldRow`** — label and help on top, control
on its own full-width line instead of the 17rem column. Used by the end-call webhook (a `Textarea`,
so a signed URL wraps and can be read end to end), the trigger phrase and the sign-off. The assistant
description and opening line are resizable textareas for the same reason. Everything else keeps the
two-column layout, which is right for switches, sliders and short selects.

**Long values are the layout's stress case.** Voice IDs are 36-character UUIDs and model IDs are
unbreakable tokens, so: `FieldRow`'s control column is `minmax(0,17rem)` and never a bare `17rem`;
stage summary chips `truncate` with the full value on `title`; and `SelectItem` taglines are wrapped
in `<span data-tagline>` so `TRIGGER_ONE_LINE` can hide them in the 40px-tall trigger while the
dropdown keeps its two-line items. Adding a new two-line select means adding both.

The catalog mirrors the backend's `src/assistant/assistant.rules.js`. When upstream adds a
model, both lists need it.

### Modes

Stored in `assistant_mode` (`AssistantMode` in `src/types/assistant.ts`):

- `realtime` — one model hears, thinks and speaks. `assistant_llm_config` carries `provider`
  (`gemini` or `openai`), `model` and `voice`. The speech stages are stored but never run, and
  `filler_words` is forced off.
- `pipeline` — a realtime model in text-only mode, spoken by a TTS provider. OpenAI only;
  **Gemini is rejected here**, because Google's Live models cannot produce the text-only
  response a half-cascade needs.
- `cascade` — three separately chosen stages, and the only mode that reads the seven LLM
  generation knobs (`temperature`, `max_output_tokens`, `reasoning_effort`, `service_tier`,
  `verbosity`, `tool_choice`, `parallel_tool_calls`) — duplex reads them too, minus `temperature`.
- `duplex` — OpenAI GPT-Live (`gpt-live-1`) hears and speaks at once; a reasoning
  `backend_model` (default `gpt-5.6-luna`, plus `backend_instructions` up to 4000 characters) does
  the thinking and tool calls. No TTS/STT stage. The API refuses filler words, a pre-recorded
  greeting and `text_only` web calls here, so the editor switches the first two off and disables
  Chat. Switching into or out of duplex replaces the stored LLM config, so the form rebuilds it.

`gpt-5.1` and `gpt-5.4-nano` are retired: a stored one stays visible so it can be moved, but the
editor names the replacement (`gpt-6-sol` / `gpt-6-luna`) instead of letting the save fail. The
Sarvam TTS `model` (`bulbul:v3` / `bulbul:v4-flash`) changes the speaker roster, pace range, sample
rates and language set, and ElevenLabs only receives the `voice_settings` its model reads.

### Things the editor has to get right

- **The two OpenAI model families are disjoint.** Pipeline and realtime take realtime model IDs
  (`gpt-realtime-1.5`); cascade takes chat model IDs (`gpt-4.1`). Sending one where the other
  belongs is a 400, so a mode change re-picks the model.
- **STT providers are mode-scoped, and pipeline degrades rather than rejects.** Every provider is
  *accepted* in pipeline; what differs is whether it actually runs. Per the upstream compatibility
  matrix:

  | Provider | `pipeline` | `cascade` |
  |---|---|---|
  | `sarvam` (default) | runs — parallel Saras v3 tap alongside the realtime model | runs — the session's own STT stage |
  | `native` | runs — the conversational LLM transcribes itself | rejected (`400`): no realtime model to self-transcribe |
  | `cartesia`, `deepgram`, `elevenlabs` | **degrades to native, logs a warning** — no parallel-tap implementation exists | runs |
  | `openai` | **collapses to native, silently** — the realtime model already transcribes with the same vendor and the same `gpt-4o-mini-transcribe`, so nothing is lost and nothing extra is billed | runs |

  **The pipeline picker therefore offers only `sarvam` and `native`** (`PIPELINE_STT_MODELS`). The
  other four are accepted by the API and then not used, and a choice that does not take effect is
  worse than one that was never offered. Switching *into* pipeline repairs an unrunnable transcriber
  to `sarvam`, the same way switching into cascade already repaired `native`.

  An assistant that was *already saved* with one of the four keeps it. `sttOptionsFor(mode, stored)`
  adds the stored value back into the list whatever the mode allows, for two reasons: a Radix
  `Select` whose value is missing from its items renders an empty trigger, which reads as data loss;
  and a user cannot repair a combination the form refuses to show them. Those rows get an
  explanation, and the two explanations stay separate — the three in `PIPELINE_DEGRADES_STT` get an
  amber warning naming cascade, `openai` gets a neutral note, because advising a mode switch for the
  `openai` case is advice to change modes for no gain.
- **A `SelectItem` may never carry `value=""`.** Radix reserves the empty string for "nothing
  selected" and *throws* on an item that uses it. The throw happens during render, so React unmounts
  the editor and the page goes blank the moment that provider is picked. Several upstream fields do
  mean the empty string — ElevenLabs `language_code` uses it for auto-detect — so `ConfigField`
  swaps it for an `EMPTY_OPTION` sentinel on the way in and back on the way out. Nothing outside
  that file sees the sentinel, and `clean()` still drops the empty string from the payload, which is
  what auto-detect means upstream. `tests/routes/dashboard/assistant/providerRendering.test.tsx`
  renders every provider in every mode at its own defaults to keep this class of bug from returning
  — no targeted field assertion catches it.
- **`api_key` is never sent from here.** The API returns every key masked and rejects a masked
  value on the way back, so both `hydrateForm` and `buildAssistantPayload` strip it. Keys are
  managed on `/dashboard/integration`, and the backend injects the real one.
- **Auto-detect is not uniform.** Omitting the language auto-detects on Sarvam and ElevenLabs,
  but falls back to English on Deepgram and OpenAI, and Cartesia cannot detect at all. A
  non-empty `preferred_languages` turns ElevenLabs auto-detect *off*.
- **Speaking rate has three different spellings** — Cartesia `speed`, Sarvam `pace`, ElevenLabs
  `voice_settings.speed`. Mistral has none.

Save validation:

- `assistant_name`, `assistant_description`, and `assistant_prompt` are required.
- If `assistant_end_call_enabled` is true, `assistant_end_call_trigger_phrase` and `assistant_end_call_agent_message` are required.

## Call Variables (`metadata`)

`assistant_prompt` and `assistant_start_instruction` support `{{...}}` placeholders that the platform
fills at call time from the call's `metadata` object. The trap: **a key the call does not supply
renders as an empty string.** No error, no fallback, no `if/else` — the call just goes out saying
"Hello , welcome back." Wrap optional text in `{{#key}}…{{/key}}` to avoid that.

The payload's shape *is* the path. Send `{"name": …}` and write `{{name}}`; send
`{"customer": {"name": …}}` and write `{{customer.name}}`. The rows in `MetadataEditor` accept dotted
keys and `expandDottedKeys` nests them on the way out; anything rows cannot express (arrays, deep
objects) goes through the **raw JSON** toggle.

`{{call.*}}` fields — `call.to_number`, `call.call_service`, and the inbound set — are supplied by the
platform, are never overwritten by your keys, and are deliberately excluded from
`extractPlaceholders`, since a user cannot fill them.

Where it is sent:

| Surface | Endpoint | Prefilled from |
|---|---|---|
| Make a Call → Agent Call | `POST /api/call/outbound` | The selected assistant's prompt, fetched on select |
| Make a Call → Passthrough | `POST /api/passthrough-call/passthrough-outbound` | Nothing — no assistant runs, so nothing fills a prompt |
| Assistant → Web Call / Chat | `POST /api/web-call/get-token` | The prompt currently in the editor, unsaved included |

Call logs render a record's `metadata` when it is present. It is **not** part of the documented
call-log response schema, so that display is defensive by design — if the API starts returning it,
it appears; until then, it does not.

## Call Logs and Analytics: what the API can and cannot do

Two limits shape these pages. Both are upstream, not local, so do not "fix" them in the UI.

**Call logs cannot be filtered by number or status.** `GET /assistant/call-logs/{id}` accepts only
`page`, `limit`, `start_date`, `end_date`, `sort_by`, `sort_order`. `GET /call/records` does have
`to_number` and `call_status` — but no `assistant_id`, so it cannot be scoped to one assistant. The
search box on `/dashboard/call-logs` therefore filters **only the rows already loaded**, and says so
in its own help text; the page size is 50 so that is worth something. If a real server-side search is
ever needed, it has to be a separate cross-assistant view built on `/call/records`, not a filter here.
Each row also shows estimated USD cost from `usage` on the log; click the amount for the LLM / TTS /
STT breakdown.

**Billable minutes is slow by construction.** There is no upstream aggregate — the backend reads every
call log for every assistant to build it (see the backend README). So on `/dashboard/analytics` it is
dispatched **first**, its loading state says what it is doing rather than showing a bare skeleton, and
it renders `assistants_skipped` as a warning when the backend could not read some of them. The
assistant filter does not apply to that card: the endpoint takes no `assistant_id`.

No other analytics cards were added because no upstream endpoint exposes call outcomes, answer rate or
cost. Computing those client-side means paging every call record — the same mistake that makes the
billable endpoint slow.

## Agent workflow

`AGENTS.md` is the single source of truth for how agents work in this repo: the skills to load,
the folder layout, the naming conventions, and the measured baseline. `CLAUDE.md` contains one
line — `@AGENTS.md` — so Claude Code imports those rules instead of keeping a second copy that
can drift.

Read `AGENTS.md` before changing anything. It also documents the workflow every non-trivial
change follows (read → baseline → propose → **ask the user** → implement one step at a time →
verify → sync the docs), and where the work is recorded:

```
agent-tracking/
├── INDEX.md                    # one row per task
├── plans/<slug>/scope.md       # the request, as asked, plus the answers
├── plans/<slug>/plan.md        # the approved plan
├── plans/<slug>/progress.md    # the step log
├── research/<slug>.md          # what was read, measured, ruled out
├── screenshots/<slug>/         # browser output
└── reports/<slug>.md           # the deliverable
```

The repo-local skills in `.agents/skills/` (`plan-before-implement`,
`react-service-structure`, `ui-design-system`, `run-intvoicekit-frontend`) are symlinked into
`.claude/skills/`. Edit `.agents/`, never the mirror.

## Production Deployment (Docker)

```bash
docker compose up -d --build
```

App is served by **nginx** on the port set in `APP_PORT` (default `3000`).

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage: Node builds, nginx serves dist |
| `nginx.conf` | SPA routing — falls back to `/index.html` |
| `docker-compose.yml` | Wires env vars and port mapping |

### Verify

```bash
curl http://localhost:3000
```
