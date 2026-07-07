# INTVyom Frontend

React + Vite frontend for the INTVyom AI voice assistant dashboard. Manages assistants, phone numbers, call logs, analytics, integrations, and audio libraries with a dark neon-cyber UI.

## Tech Stack

| Category | Libraries |
|---|---|
| **Framework** | React 18, TypeScript 5, Vite 5 (SWC fast-refresh) |
| **Routing** | React Router v6 (nested layout routes) |
| **Data Fetching** | TanStack Query v5 |
| **Forms** | react-hook-form + Zod + @hookform/resolvers |
| **Styling** | Tailwind CSS 3.4, `tailwindcss-animate`, `tailwind-merge` + `clsx` |
| **UI Components** | shadcn/ui (49 Radix-based primitives) |
| **Charts** | Recharts |
| **Animation** | Framer Motion |
| **Real-time Voice** | LiveKit (`@livekit/components-react`) |
| **Notifications** | Sonner |
| **Icons** | Lucide React |
| **Carousel** | Embla Carousel |
| **Date Handling** | date-fns, react-day-picker |
| **Testing** | Vitest + Testing Library + jsdom |
| **Linting** | ESLint 9 (flat config) + typescript-eslint |
| **Dev Tooling** | Lovable tagger |

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

The `DashboardLayout` (`src/components/DashboardLayout.tsx`) provides:
- Collapsible sidebar navigation (desktop)
- Sheet-based navigation (mobile, < 768px)
- User avatar + logout
- Watermark background
- `<Outlet />` for nested route content

## Project Structure

```
INTVyom_Frontend/
├── .agents/skills/               # AI coding assistant skill definitions
│   ├── coding-skills/SKILL.md
│   └── ui-ux-premium/SKILL.md
├── .claude/skills/               # Claude-specific skill symlinks
├── public/                       # Static assets (served as-is)
│   ├── logos/                    # TTS provider logos
│   │   ├── cartesia.png
│   │   ├── elevenlabs.png
│   │   └── sarvam.png
│   ├── robots.txt                # Crawler allowlist
│   └── placeholder.svg
├── src/                          # Application source
│   ├── components/
│   │   ├── ui/                   # 49 shadcn/ui primitives (button, card, dialog,
│   │   │                         #   table, form, sidebar, tooltip, toast, etc.)
│   │   ├── DashboardLayout.tsx   # App shell with sidebar + mobile nav
│   │   └── NavLink.tsx           # React Router NavLink wrapper
│   ├── hooks/
│   │   ├── use-mobile.tsx        # Mobile breakpoint detection (768px)
│   │   ├── use-toast.ts          # Toast notification reducer
│   │   └── useChatTranscriptions.ts  # LiveKit transcription stream
│   ├── lib/
│   │   ├── analytics.ts          # Analytics API client + data normalizers
│   │   ├── analytics.test.ts     # Analytics utility tests
│   │   ├── auth.ts               # localStorage-based auth helpers
│   │   └── utils.ts              # cn() (clsx + tailwind-merge)
│   ├── pages/
│   │   ├── Analytics.tsx         # Dashboard analytics & charts
│   │   ├── Analytics.test.tsx    # Analytics page tests
│   │   ├── ApiKeys.tsx           # API key management
│   │   ├── Assistant.tsx         # AI assistant config (realtime/pipeline)
│   │   ├── AudioLibrary.tsx      # Audio file library
│   │   ├── Auth.tsx              # Login page
│   │   ├── CallLogs.tsx          # Call history logs
│   │   ├── Inbound.tsx           # Inbound route config
│   │   ├── InboundContext.tsx    # Inbound context rules
│   │   ├── Index.tsx             # Landing page
│   │   ├── Integrations.tsx      # Third-party integrations
│   │   ├── MakeCall.tsx          # Outbound call interface
│   │   ├── NotFound.tsx          # 404 page
│   │   ├── PassthroughCallRecords.tsx  # Passthrough call records
│   │   ├── PhoneNumber.tsx       # Phone number management
│   │   └── Tools.tsx             # Tools & utilities
│   ├── test/
│   │   ├── setup.ts              # Test env setup (matchMedia, ResizeObserver mocks)
│   │   └── example.test.ts       # Sanity test
│   ├── App.tsx                   # Root component (providers + routes)
│   ├── App.css                   # Vite boilerplate (mostly unused)
│   ├── index.css                 # Tailwind directives + design tokens
│   ├── main.tsx                  # Application entry point
│   └── vite-env.d.ts             # Vite type declarations
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
├── tsconfig.app.json             # TS config for src/
├── tsconfig.node.json            # TS config for Vite configs
├── vite.config.ts                # Vite bundler config (@ alias → ./src)
├── vitest.config.ts              # Vitest config (jsdom, path alias)
└── eslint.config.js              # ESLint flat config
```

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
- **Components:** 49 shadcn/ui primitives in `src/components/ui/`
- **CSS Utilities:** `neon-border`, `neon-glow`, `glass` (frosted glass), `watermark`, `status-chip`, `page-shell`, `page-padding`, `content-max`
- **Animations:** `accordion-down`, `accordion-up`, `pulse-neon` (Tailwind config)
- **Font:** System font stack with Inter

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
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |

## Environment Variables

Create a `.env` file in the root:

```env
VITE_BACKEND_URL=https://your-api-domain
VITE_LIVEKIT_URL=wss://your-livekit-domain
APP_PORT=8003
```

> `.env` is git-ignored — never commit real secrets.

| Variable | Purpose |
|---|---|
| `VITE_BACKEND_URL` | Backend API base URL |
| `VITE_LIVEKIT_URL` | LiveKit WebSocket server URL |
| `APP_PORT` | Docker host port mapping |

## Testing

- **Framework:** Vitest 3 with jsdom environment
- **Globals enabled,** path alias `@/` configured
- **Setup file:** `src/test/setup.ts` (mocks `matchMedia`, `ResizeObserver`)
- **Pattern:** `src/**/*.{test,spec}.{ts,tsx}`

```bash
npm run test         # Run once
npm run test:watch   # Watch mode
```

## Assistant Editor Modes

`/dashboard/assistant` supports two assistant runtime modes:

- `realtime` (default for new assistants)
  - Uses `assistant_llm_mode: "realtime"` and `assistant_llm_config`
  - Configurable fields: `provider`, `model`, `voice`
  - For `provider=gemini`, API key is expected from `/dashboard/integration`
  - For non-Gemini providers, optional per-assistant `api_key` override is supported
  - `filler_words` is enforced as `false` by backend in realtime mode
- `pipeline`
  - Uses `assistant_llm_mode: "pipeline"` and TTS settings
  - Configurable fields: `assistant_tts_model` and `assistant_tts_config`

Save validation:

- `assistant_name`, `assistant_description`, and `assistant_prompt` are required.
- If `assistant_end_call_enabled` is true, `assistant_end_call_trigger_phrase` and `assistant_end_call_agent_message` are required.

## Production Deployment (Docker)

```bash
docker compose up -d --build
```

App is served by **nginx** on the port set in `APP_PORT` (default `8003`).

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage: Node builds, nginx serves dist |
| `nginx.conf` | SPA routing — falls back to `/index.html` |
| `docker-compose.yml` | Wires env vars and port mapping |

### Verify

```bash
curl http://localhost:8003
```
