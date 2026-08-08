# INTVyom Frontend

React + Vite frontend for the INTVyom AI voice assistant dashboard. Manages assistants, phone numbers, call logs, analytics, integrations, and audio libraries with a dark neon-cyber UI.

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
| **UI Components** | shadcn/ui (24 Radix-based primitives) |
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
  /dashboard/api-keys      → API key management
  /dashboard/integration   → Third-party integrations (Gemini API keys, etc.)

*                          → 404 Not Found
```

The `DashboardLayout` (`src/routes/dashboard/DashboardLayout.tsx`) provides:
- Collapsible sidebar navigation (desktop)
- Sheet-based navigation (mobile, < 768px)
- User avatar + logout
- Watermark background
- `<Outlet />` for nested route content

## Project Structure

The canonical layout is defined by the `react-service-structure` skill; `AGENTS.md`
records this repo's deviations from it.

```
INTVyom_Frontend/
├── AGENTS.md                     # Repo rules for AI coding agents — read first
├── .agents/skills/               # Agent skill definitions (single source of truth)
│   ├── coding-skills/SKILL.md
│   ├── react-service-structure/SKILL.md   # Canonical folder layout + README standard
│   └── ui-ux-premium/SKILL.md
├── .claude/skills/               # Symlinks into .agents/skills/ — never edit directly
├── public/                       # Static assets (served as-is)
│   ├── logos/                    # TTS provider logos (cartesia, elevenlabs, sarvam)
│   ├── robots.txt                # Crawler allowlist
│   └── placeholder.svg
├── src/                          # Application source
│   ├── routes/                   # One directory per top-level route, with a barrel index.ts
│   │   ├── Index/                # Landing page
│   │   ├── Auth/                 # Login page
│   │   ├── NotFound/             # 404 page
│   │   └── dashboard/            # App shell (DashboardLayout) + nested pages
│   │       ├── DashboardLayout.tsx  # Sidebar shell + mobile nav
│   │       ├── assistant/        # Assistant editor — split into:
│   │       │                     #   Assistant.tsx (page), AssistantForm.tsx (editor body),
│   │       │                     #   Llm/Stt/TtsSection.tsx + StageSection.tsx (the rail),
│   │       │                     #   ConfigField.tsx, ProviderFields.tsx (spec renderers),
│   │       │                     #   providerCatalog.ts (all providers), assistantConfig.ts,
│   │       │                     #   AssistantChat.tsx (LiveKit chat modal),
│   │       │                     #   useAssistantList.ts, useChatTranscriptions.ts, constants.ts
│   │       ├── tools/            # Tools & utilities
│   │       ├── audio-library/    # Audio file library
│   │       ├── call-logs/        # Call history logs
│   │       ├── analytics/        # Dashboard analytics & charts
│   │       ├── phone-number/     # Phone number management
│   │       ├── inbound/          # Inbound route config
│   │       ├── inbound-context/  # Inbound context rules
│   │       ├── integrations/     # Third-party integrations
│   │       ├── make-call/        # Outbound call interface
│   │       ├── passthrough-call-records/  # Passthrough call records
│   │       └── api-keys/         # API key management
│   ├── services/                 # One module per backend API domain (call/condense pattern)
│   │   ├── analytics/analyticsService.ts
│   │   ├── assistant/assistantService.ts
│   │   ├── tool/toolService.ts
│   │   ├── audio/audioService.ts
│   │   ├── sip/sipService.ts
│   │   ├── inbound/inboundService.ts
│   │   ├── inboundContext/inboundContextService.ts
│   │   ├── integration/integrationService.ts
│   │   ├── passthroughCall/passthroughCallService.ts
│   │   ├── call/callService.ts
│   │   ├── webCall/webCallService.ts
│   │   ├── auth/authService.ts
│   │   └── storage/storageService.ts   # localStorage helpers (getStoredUser, etc.)
│   ├── types/                    # One module per domain (http, auth, assistant, tool, ...)
│   ├── components/
│   │   ├── common/               # App-aware, domain-agnostic; shared by 3+ routes
│   │   │   ├── MasterDetailShell.tsx   # Two-pane list/detail layout with mobile toggle
│   │   │   └── EmptyState.tsx          # "Nothing selected yet" detail-pane panel
│   │   └── ui/                   # 24 shadcn/ui primitives (button, card, dialog,
│   │                             #   table, select, tooltip, toast, ...) — CLI-generated
│   ├── hooks/
│   │   └── use-toast.ts          # Toast notification reducer
│   ├── lib/
│   │   └── utils.ts              # cn() (clsx + tailwind-merge)
│   ├── App.tsx                   # Root component (providers + routes)
│   ├── index.css                 # Tailwind directives + design tokens
│   ├── main.tsx                  # Application entry point
│   └── vite-env.d.ts             # Vite type declarations
├── tests/                        # Vitest suites, mirroring source paths
│   ├── setup.ts                  # Test env setup (matchMedia, ResizeObserver mocks)
│   ├── components/common/        # MasterDetailShell, EmptyState
│   ├── routes/dashboard/analytics/Analytics.test.tsx
│   ├── routes/dashboard/assistant/useAssistantList.test.tsx
│   └── services/analytics/analyticsService.test.ts
├── dist/                         # Production build output
├── Dockerfile                    # Multi-stage: Node build → nginx serve
├── docker-compose.yml            # Single frontend service
├── nginx.conf                    # SPA fallback to index.html
├── deploy.sh                     # git pull + docker compose up -d --build
├── .env                          # Live env vars (git-ignored)
├── .env.example                  # Env var template
├── package.json
├── bun.lockb                     # Bun lockfile
├── components.json               # shadcn/ui configuration
├── tailwind.config.ts            # Tailwind theme (neon colors, animations)
├── postcss.config.js             # Tailwind + Autoprefixer
├── tsconfig.json                 # Root TS config (project references)
├── tsconfig.app.json             # TS config for src/ and tests/
├── tsconfig.node.json            # TS config for Vite configs
├── vite.config.ts                # Vite bundler config (@ alias → ./src)
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

Pages import service functions only — no inline `fetch` calls live in `src/routes/`.
Browser storage access (`getStoredUser`, `storeUser`, `clearUser`) lives in
`src/services/storage/storageService.ts`.

**LiveKit is the exception.** A realtime room is a long-lived session, not a
request/response pair, so it does not fit `call`/`condense`.
`webCall/webCallService.ts` mints the token via the normal pair; the room lifecycle
itself is driven by `@livekit/components-react` inside the `assistant` and
`make-call` routes.

## Features / Pages

| Page | Route | Description |
|---|---|---|
| **Make a Call** | `/dashboard/make-call` | Initiate an outbound AI voice call |
| **Assistant** | `/dashboard/assistant` | Configure AI assistant (realtime, pipeline or cascade mode) |
| **Tools** | `/dashboard/tools` | Utility tools and actions |
| **Audio Library** | `/dashboard/audio-library` | Upload and manage audio files |
| **Call Logs** | `/dashboard/call-logs` | Browse call history and recordings |
| **Analytics** | `/dashboard/analytics` | Usage metrics, charts, and breakdowns |
| **Phone Number** | `/dashboard/phone-number` | Manage purchased phone numbers |
| **Inbound Routes** | `/dashboard/inbound` | Configure inbound call routing |
| **Inbound Context** | `/dashboard/inbound-context` | Set inbound context rules |
| **Passthrough Records** | `/dashboard/passthrough-call-records` | Passthrough call records |
| **API Keys** | `/dashboard/api-keys` | Manage API credentials |
| **Integration** | `/dashboard/integration` | Third-party integrations (e.g., Gemini API key) |

## Design System

- **Theme:** Dark mode only with HSL CSS variables defined in `src/index.css`
- **Primary:** Teal/cyan (`hsl(172 66% 50%)`) with neon glow effects
- **Background:** Very dark slate (`hsl(222 47% 6%)`)
- **Components:** 24 shadcn/ui primitives in `src/components/ui/`, plus
  `MasterDetailShell` and `EmptyState` in `src/components/common/`
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

## Assistant Editor

`/dashboard/assistant` draws the audio path as a chain that **redraws when the mode changes**, then
renders only the stages that mode actually runs. The three modes have different *shapes*, not just
different settings, so nothing is drawn greyed-out to stand in for a stage that does not exist:

| Mode | Chain | Stages rendered |
|---|---|---|
| `realtime` | Caller → model (hears, thinks, speaks) → Caller | Realtime model only |
| `pipeline` | Caller → realtime model → voice → Caller, with a transcript tap hanging off the model | Realtime model (with the tap nested inside it), then Voice |
| `cascade` | Caller → transcriber → text model → voice → Caller | All three, numbered 1–3 |

The pipeline distinction is the one worth keeping straight: its transcriber is a **parallel tap**.
The realtime model hears the caller's audio directly; the tap only decides what the saved transcript
says. Drawing it as a fourth box in the row would read as a cascade, so it is drawn as a branch.

### Where the knobs live

| File | Holds |
|---|---|
| `providerCatalog.ts` | Every provider, model ID, language list and field spec, plus the `help` / `warn` copy shown under each control. Adding a provider is one entry here. |
| `assistantConfig.ts` | Pure form ⇄ API translation: `hydrateForm`, `buildAssistantPayload`, and the `applyModeChange` / `applySttProvider` / `applyTtsProvider` repairs. |
| `ConfigField.tsx` / `ProviderFields.tsx` | Render a spec against a stored config. One level of nesting is supported, for ElevenLabs `voice_settings`. |
| `StageSection.tsx` | One stage on the rail (or, with `nested`, a side channel hanging off the stage above), with its live summary chips and Advanced accordion. Also exports `TRIGGER_ONE_LINE`. |
| `AudioChain.tsx` | The chain diagram. Presentational only — it reads the same values the stages do. |
| `PromptEditor.tsx` | System prompt, opening line, and the `{{placeholders}}` they ask for. |
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
  `verbosity`, `tool_choice`, `parallel_tool_calls`).

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

**Billable minutes is slow by construction.** There is no upstream aggregate — the backend reads every
call log for every assistant to build it (see the backend README). So on `/dashboard/analytics` it is
dispatched **first**, its loading state says what it is doing rather than showing a bare skeleton, and
it renders `assistants_skipped` as a warning when the backend could not read some of them. The
assistant filter does not apply to that card: the endpoint takes no `assistant_id`.

No other analytics cards were added because no upstream endpoint exposes call outcomes, answer rate or
cost. Computing those client-side means paging every call record — the same mistake that makes the
billable endpoint slow.

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
