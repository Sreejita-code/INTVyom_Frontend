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
| **Assistant** | `/dashboard/assistant` | Configure AI assistant (realtime or pipeline mode) |
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

## Assistant Editor Modes

`/dashboard/assistant` supports three assistant runtime modes, stored in
`assistant_mode` (`AssistantMode` in `src/types/assistant.ts`):

- `realtime` (default for new assistants)
  - Uses `assistant_llm_config`: `provider`, `model`, `voice`
  - For `provider=gemini`, the API key comes from `/dashboard/integration`
  - `filler_words` is enforced as `false` by the backend in realtime mode
- `pipeline`
  - Separate STT → LLM → TTS stages
  - Uses `assistant_stt_model` / `assistant_stt_config` and
    `assistant_tts_model` / `assistant_tts_config`
- `cascade`
  - Like `pipeline`, but the LLM stage is an OpenAI chat model chosen from
    `CASCADE_LLM_MODELS` (`src/routes/dashboard/assistant/constants.ts`);
    Gemini is not offered in this mode

Save validation:

- `assistant_name`, `assistant_description`, and `assistant_prompt` are required.
- If `assistant_end_call_enabled` is true, `assistant_end_call_trigger_phrase` and `assistant_end_call_agent_message` are required.

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
