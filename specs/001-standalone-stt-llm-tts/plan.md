# Plan 001 — Standalone STT, LLM and TTS

- **Spec:** [spec.md](spec.md)
- **Last changed:** 2026-11-08

## Technical context

Read from `package.json` and the repo on 2026-11-08, not from memory.

- React 18.3, TypeScript, Vite (`@vitejs/plugin-react-swc`), `react-router-dom` 6.30, Tailwind with `tailwindcss-animate`, shadcn/ui primitives in `src/components/ui/` (tabs, select, switch, slider, sheet, tooltip, scroll-area, accordion all present), `lucide-react`, `framer-motion`, `sonner` and the shadcn toaster.
- `@tanstack/react-query` is installed. This plan does not use it: every call here is user-triggered, cancellable, and one of them streams. Plain async functions with an `AbortController` fit better (see Research decisions).
- Tests: Vitest in jsdom, Testing Library, suites under `tests/` mirroring `src/`. Baseline from `AGENTS.md`: 51 files, 426 tests pass; lint has 82 known problems.
- Services follow `call<X>Endpoint` / `condense<X>Response`, use `authedFetch` and `readJson`, base URL `import.meta.env.VITE_BACKEND_URL`.
- `src/lib/apiSnippet.ts` renders cURL, Python and Node from a `RequestSpec`, but only supports a JSON body today. `src/components/common/ApiSnippet.tsx` wraps it in a sheet.
- The assistant provider catalogue (`src/routes/dashboard/assistant/providerCatalog.ts`) already holds STT and TTS providers, model options, language sets and prices (`STT_PROVIDERS`, `TTS_PROVIDERS`, `OPENAI_CASCADE_MODELS`).
- Upstream contract: production API docs MCP (`/api/stt/transcribe`, `/api/llm/chat`, `/api/tts/synthesize`) and upstream docs `api/stt.md`, `api/llm.md`, `api/tts.md`.

## Constitution check

| # | Principle | Gate question | Answer | Note |
|---|-----------|---------------|--------|------|
| 1 | Test-first behaviour | Does every behavioural `AC-n` have a test step that runs before its code step? | yes | Contracts table maps each AC to a test file; `tasks.md` orders test before code. Visual ACs (AC-21) use the sweep screenshots. |
| 2 | Simplicity and reuse | Does the plan list the reuse inventory and justify each new component? | yes | See Design, Reuse inventory. |
| 3 | Every state designed | Does the plan cover all four states for every data view? | yes | See Design, States per view. |
| 4 | Accessible by default | Does the plan state keyboard behaviour and accessible names? | yes | See Design, Accessibility. |
| 5 | Responsive and themed | Does the plan name the widths and themes to verify? | yes | 375, 768, 1024, 1440, 1920 px, light and dark, through `driver.mjs sweep`. |
| 6 | Tokens, not literals | Does the plan use existing tokens, and name any new one? | yes | No new tokens. Colours come from existing semantic classes (`text-muted-foreground`, `bg-card`, `border`, `destructive`, `primary`). |
| 7 | Repo conventions | Does the plan follow the `AGENTS.md` service, import, naming, and placement rules? | yes | One flagged deviation: cross-route import of `providerCatalog`, recorded under Complexity tracking. |

## Design

### Design read and dials

An operations console for developers who will paste code into their own project. They are in a working mood: they want to change a value, send, read the raw result, copy. So density is moderate-high, motion is nearly absent, and layout is conventional so it feels like the other dashboard pages.

| Dial | Value | Reason |
|------|-------|--------|
| Variance | 3 | Same page frame as Developer, Tools and Audio Library. |
| Motion | 2 | Only state changes: a recording pulse, streamed text, tab content. Respect `prefers-reduced-motion`. |
| Density | 6 | Many option fields; grouped, with advanced ones folded. |

### Directions

1. **Recommended — Workbench with three tabs.** Page header (title, one-line purpose, endpoint chip `POST /api/stt/transcribe` with copy). Below it tabs: Try it, Code, Reference. In Try it, two columns from 1024 px: options and input on the left, result on the right; one column below. Code tab shows the snippet for exactly what is set in Try it. Reference tab is a static, scannable documentation page. Matches AC-2 and the existing pages' feel.
2. Single long page. Try it on top, then code, then reference as accordions. Less clicking, but the page gets long and the snippet scrolls away from the inputs that drive it. Rejected.
3. Always-visible code beside the form, reference in a drawer. Best for "see the code change as I type", but at 1024 px three columns (options, result, code) do not fit, and phones lose it anyway. Rejected; the Code tab already reads live state.

The tab choice is held in the URL (`?tab=code`), so a reload keeps it (AC-2) and a link opens a given tab. Default is `try`.

### Page anatomy

```
Header: icon, title, purpose line, endpoint chip
Tabs:   Try it | Code | Reference
Try it  left:  OptionsForm (provider, model, language/voice, assistant, advanced: provider key)
               Input (STT: Recorder + file drop | LLM: message list | TTS: textarea + counter)
               Send / Cancel
        right: ResultPanel (empty | loading | error | success)
Code    language tabs (cURL, Python, Node.js) over one snippet, copy button, key placeholder
        a variant switch where it matters (LLM: normal | stream; TTS: audio | json)
Reference  Request (headers, fields table), Response (field table, nullable flagged),
           Samples (request, response, copyable), Errors table (status, cause, what to do)
```

### States per view

| View | Loading | Empty | Error | Partial data |
|------|---------|-------|-------|--------------|
| STT result | skeleton shaped like transcript + usage rows, Cancel; recording shows timer | explains output, "Record" and "Choose file" | message + suggestions + hint, input kept, Retry | `null` fields "not reported"; `pricing_complete: false` notice |
| LLM result | skeleton, then streamed text; Stop; "Raw events" tab | starter conversation offered | message + hints; text received so far kept and marked cut off | same nullable and partial-pricing handling |
| TTS result | skeleton player, Cancel | sample text offered | message + hints, text kept | usage missing when headers unreadable: note to use `json` |
| Assistant picker | small skeleton in the select | "No assistants yet", link to Assistants, page still works | "Could not load assistants", Retry, page still works | — |
| Reference, Code | static, no loading | — | — | — |

The Code and Reference tabs never fetch, so they have no loading or error state by design.

### Accessibility

- Tab order: header endpoint copy, tabs, option fields in reading order, input, Send, result. Tabs use the existing Radix tabs (arrow-key navigation built in).
- Record, Stop, Play, Send, Cancel, Copy and each field have accessible names. The Record button toggles `aria-pressed`; the timer is `role="timer"`.
- The result region is `aria-live="polite"`; the error region is `role="alert"`. Streamed text announces on pause, not per token (the live region is updated on completion of a sentence or on end, not per chunk).
- Send is a real `<button type="submit">` so Enter in a single-line field submits; the LLM message box uses Ctrl/Cmd+Enter and says so.
- Focus returns to Send after Cancel, and moves to the error region on failure.
- Contrast comes from existing tokens.

### Reuse inventory

| Need | Reused | New, and why none fits |
|------|--------|------------------------|
| Page frame, tabs, select, switch, slider, accordion, skeleton, toast, tooltip | `src/components/ui/*` | — |
| Copy to clipboard | `useCopyToClipboard`, `CopyIdButton` | — |
| Empty state | `EmptyState` | — |
| Sample JSON blocks | `JsonSample` | — |
| Snippet rendering | `renderSnippet`, `SNIPPET_LANGUAGES` in `src/lib/apiSnippet.ts` | Extend it for multipart, streaming and binary (needed by AC-13; today it only does JSON bodies). |
| Snippet language tabs inline | inner part of `ApiSnippetButton` | `SnippetPanel` extracted from it, used by the existing sheet and the three new pages (4 users, meets the extraction bar). |
| Endpoint page shell (header, tabs, URL `tab` param) | none | `PlaygroundShell` in `components/common/`; used by 3 routes. |
| Reference tables | none | `EndpointReference` in `components/common/`; used by 3 routes. |
| Usage and cost block | none | `UsageSummary` in `components/common/`; used by 3 routes (token usage differs, so it takes a list of label and value rows). |
| Error display with suggestions | none | `ApiErrorPanel` in `components/common/`; used by 3 routes. |
| Optional provider key input | none | `ProviderKeyField` in `components/common/`; used by 3 routes. |
| Optional assistant select | `callListAssistantsEndpoint` and `condenseListAssistantsResponse` in `assistantService.ts` (`useAssistantList` belongs to the assistant route and owns pagination, so it is not reused) | `AssistantPicker` in `components/common/`. Used by 3 routes. |
| Provider and model suggestions | `STT_PROVIDERS`, `TTS_PROVIDERS`, `OPENAI_CASCADE_MODELS`, language sets in `providerCatalog.ts` | — (cross-route import, see Complexity tracking) |
| Microphone recorder | none | `useAudioRecorder` in `src/routes/dashboard/stt/` (one route only, so it stays there). |
| SSE line parsing | none | `src/lib/sseEvents.ts`, pure (`parseSseChunk`), used by the LLM service only but kept pure and testable in `lib/`. |
| Error body normalisation | `readJson` | `condenseApiError` in `src/lib/apiError.ts` (3 services use it). |

No new dependency. Recording is the browser's `MediaRecorder`; playback is a native `<audio>` element.

### Placement

Per `AGENTS.md`:

```
src/routes/dashboard/stt/   Stt.tsx  index.ts  SttForm.tsx  SttResult.tsx  useAudioRecorder.ts  sttReference.ts  sttSnippet.ts
src/routes/dashboard/llm/   Llm.tsx  index.ts  LlmForm.tsx  LlmResult.tsx  llmReference.ts  llmSnippet.ts
src/routes/dashboard/tts/   Tts.tsx  index.ts  TtsForm.tsx  TtsResult.tsx  ttsReference.ts  ttsSnippet.ts
src/components/common/      PlaygroundShell.tsx  EndpointReference.tsx  UsageSummary.tsx  ApiErrorPanel.tsx
                            ProviderKeyField.tsx  AssistantPicker.tsx  SnippetPanel.tsx
src/services/stt/sttService.ts   src/services/llm/llmService.ts   src/services/tts/ttsService.ts
src/types/stt.ts  src/types/llm.ts  src/types/tts.ts
src/lib/sseEvents.ts  src/lib/apiError.ts   (apiSnippet.ts extended)
tests/…  mirrors each of the above
```

Wiring: three `<Route>` lines in `src/App.tsx`, three entries in `src/routes/dashboard/navItems.ts` under the "Developers" section (Speech to Text, LLM Chat, Text to Speech), which also feeds the sidebar and the ⌘K palette (AC-1). The README and the `AGENTS.md` Repository structure section are updated in the same change.

## Data model

Types in `src/types/`. Each field traces to an AC.

- **Shared (`src/types/http.ts` unchanged; `ApiError` is exported from `src/lib/apiError.ts` next to `condenseApiError`):** `ApiError { status: number; message: string; suggestions: Record<string, string> }` (AC-12). `suggestions` is an object keyed by slot, never an array.
- **STT (`src/types/stt.ts`):** `SttRequest { file: Blob; provider?; model?; language?; assistantId? }` (AC-3, AC-4). `SttResult { text; language: string|null; durationSeconds: number|null; provider; model: string|null; usage: SttUsage }` (AC-5). `SttUsage { audioDurationSeconds: number|null; estimatedCostUsd: number|null; pricingComplete: boolean }`.
- **LLM (`src/types/llm.ts`):** `ChatMessage { role: "system"|"user"|"assistant"; content }`. `LlmRequest { messages; provider?; model?; temperature?; maxTokens?; assistantId?; stream }` (AC-6). `LlmResult { message; provider; model|null; usage: LlmUsage }` (AC-7). `LlmUsage { promptTokens|null; completionTokens|null; totalTokens|null; estimatedCostUsd|null; pricingComplete }`.
- **TTS (`src/types/tts.ts`):** `TtsRequest { text; provider?; model?; voice?; language?; saveToLibrary; responseFormat: "audio"|"json"; assistantId? }` (AC-8, AC-9, AC-25). `TtsResult { audio: Blob; mediaType; provider; model|null; usage: TtsUsage|null }`. `TtsUsage { charactersCount|null; audioDurationSeconds|null; estimatedCostUsd|null; pricingComplete }`.
- **Invariants:** unset optional request fields are omitted from the wire, never sent as empty strings (AC-4). `null` stays `null` through `condense`; only the view turns it into "not reported" (AC-5). The provider key is not part of any type that is stored; it travels as an argument and a header (AC-10).

## Contracts

### Service functions (AC-11, AC-12; `AGENTS.md` pattern)

| Function | Does | Returns |
|----------|------|---------|
| `callTranscribeEndpoint({ request, providerKey?, signal? })` | `POST /api/stt/transcribe`, multipart (`FormData`, no manual `Content-Type`), `authedFetch`, `readJson` | `{ ok, status, json }` |
| `condenseTranscribeResponse(json)` | raw payload to `SttResult`, tolerant of missing `usage` | `SttResult` |
| `callChatEndpoint({ request, providerKey?, signal? })` | `POST /api/llm/chat` JSON, `stream:false` | `{ ok, status, json }` |
| `condenseChatResponse(json)` | raw to `LlmResult` | `LlmResult` |
| `callChatStreamEndpoint({ request, providerKey?, signal? })` | same URL, `stream:true`; returns the `Response` so the caller reads `body` | `{ ok, status, response }` (on `!ok` the body is read with `readJson`) |
| `callSynthesizeEndpoint({ request, providerKey?, signal? })` | `POST /api/tts/synthesize`; on `json` uses `readJson`; on `audio` and `ok` reads `blob()` and the headers, on `!ok` uses `readJson` | `{ ok, status, json?, blob?, headers? }` |
| `condenseSynthesizeJsonResponse(json)` | decodes `audio_base64` to a `Blob` | `TtsResult` |
| `condenseSynthesizeAudioResponse(blob, headers)` | usage from `X-TTS-Characters`, `X-Audio-Duration`, `X-Estimated-Cost-USD`, `X-Pricing-Complete`, `X-Provider`, `X-Model`; `usage: null` when none readable | `TtsResult` |

These are the documented exception to `{ ok, json }` only where the body is not JSON (stream, audio). Every function still uses `authedFetch`, so a `401` clears the session and returns to `/auth` (AC-11). Errors come back as data (`ok:false`), not thrown, matching the other read services; a `fetch` rejection (offline) is caught in the route and shown as a network error (AC-12). `AbortError` is not an error (AC-16).

### Pure helpers

- `parseSseChunk(buffer: string): { events: string[]; rest: string }` splits on blank lines, keeps the partial tail; `deltaOf(event)` reads `choices[0].delta.content`; `"[DONE]"` is the end marker. Unknown event shapes are kept for the Raw events view and yield no text (AC-7, AC-23).
- `condenseApiError(json, status): ApiError` reads `error` (string) and `suggestions` (object), always returns a message, never throws (AC-12).
- `apiSnippet.ts` additions, all optional so existing callers are unchanged: `RequestSpec.form?: { fields: Record<string, string|undefined>; file?: { field: string; filename: string } }` for multipart (`curl -F`, Python `files=`/`data=`, Node `FormData`); `RequestSpec.response?: "json" | "stream" | "binary"` drives the tail (SSE read loop; write bytes to `speech.wav`). Empty or `undefined` fields are dropped (AC-13).

### Behaviour rules

- STT: reject files over 25 MB (26 214 400 bytes) and unsupported types before sending (AC-3). A recording becomes a `File` named `recording.webm`, `.ogg` or `.m4a` from the recorder's actual MIME type, so the backend gets a matching extension.
- LLM: Send is disabled when there is no message with non-empty `content` (AC-6). `temperature` is clamped to 0 to 2 and `max_tokens` to 1 or more in the form, with an inline message.
- TTS: character count is live; 0 or over 5000 disables Send (AC-8). `save_to_library` off by default with a note when on (AC-25).
- Provider key: held in component state only, rendered `type="password"`, sent as `X-Provider-API-Key`, never written to storage, never passed into snippet text unless the "include keys" switch is on (AC-10). Reload clears it by construction.
- Snippets always print `$VOICEKIT_API_KEY` for the VoiceKit key and `$PROVIDER_API_KEY` for the provider key, when the provider key field is non-empty (AC-13).
- `?tab=` accepts `try`, `code`, `reference`; anything else falls back to `try` (AC-2).

### Acceptance criteria to tests

| AC | Test (written first) |
|----|----------------------|
| AC-1 | `tests/routes/dashboard/DashboardSidebar.test.tsx`, `CommandPalette.test.tsx`: three new entries; route render test per page |
| AC-2 | `tests/components/common/PlaygroundShell.test.tsx`: tab from URL, fallback to `try`, switching updates the URL |
| AC-3, AC-18 | `tests/routes/dashboard/stt/Stt.test.tsx`: file type and size rejection, recorder mock (permission granted, denied, unavailable) |
| AC-4, AC-5, AC-12, AC-16, AC-17 | same file: options omitted when unset, result rendering with nulls and partial pricing, each error status, cancel, empty sample |
| AC-6, AC-7, AC-23 | `tests/routes/dashboard/llm/Llm.test.tsx`, `tests/lib/sseEvents.test.ts`: stream split across chunk boundaries, `[DONE]`, unknown event, stop keeps partial text |
| AC-8, AC-9, AC-24, AC-25 | `tests/routes/dashboard/tts/Tts.test.tsx`: limits, both formats, headers unreadable fallback, suggestions, warning |
| AC-10 | `tests/components/common/ProviderKeyField.test.tsx` plus a service test asserting the header, and a test that `localStorage` and `sessionStorage` stay empty |
| AC-11 | `tests/services/bearerIdentity.test.ts` extended with the three new services |
| AC-13 | `tests/lib/apiSnippet.test.ts` extended: multipart, stream, binary, dropped unset fields, Python still compiles where `python3` exists |
| AC-14, AC-15 | `tests/components/common/EndpointReference.test.tsx` plus one test per `*Reference.ts` that its field list matches the documented request fields |
| AC-19 | `tests/components/common/AssistantPicker.test.tsx`: list, none, load error |
| AC-20 | assertions on accessible names and roles inside each page test |
| AC-21 | `driver.mjs sweep` at five widths, light and dark, screenshots to `agent-tracking/screenshots/` |
| AC-22 | full existing suite stays green; `git diff` shows no change to existing route files besides `App.tsx` and `navItems.ts` |

## Research decisions

| Choice | Options compared | Picked | Why |
|--------|------------------|--------|-----|
| Tab state | `localStorage`/`sessionStorage`; URL search param; component state | URL `?tab=` | Survives reload, linkable, no storage key to own (`AGENTS.md` keeps storage in `storageService`). |
| Data fetching | `react-query` mutations; plain async with `AbortController` | Plain async | User-triggered, cancellable, one call streams; no cache needed. Consistent with the `call`/`condense` services. |
| LLM streaming | `EventSource`; `fetch` + `ReadableStream` | `fetch` stream | `EventSource` is GET-only and cannot send a bearer header or a body. `authedFetch` already handles `401`. |
| Recording | add a recorder library; native `MediaRecorder` | Native | No dependency. The MIME type is read from the recorder so the file extension is honest (Safari records `audio/mp4`, sent as `.m4a`, which the API accepts). |
| TTS format in UI | audio only; json only; both | Both, per spec | `audio` is the default and streams; `json` returns full usage with no CORS header dependency. |
| TTS usage in `audio` mode | assume headers readable; read and fall back | Read and fall back | A cross-origin response only exposes custom `X-*` headers if the backend sends `Access-Control-Expose-Headers`. The docs do not say it does. The page shows usage when readable and otherwise says to use `json` (AC-9). |
| Snippet extension | new renderers beside `apiSnippet.ts`; extend `RequestSpec` | Extend, optional fields | One renderer set, existing callers and tests unchanged. |
| Reference content | fetch swagger at runtime; static modules per route | Static modules | No runtime dependency on the docs server; a test pins each list to the documented fields so drift is caught when someone updates it. |
| Provider and model suggestions | copy lists into new files; import the catalogue; move the catalogue | Import in place | Copying would duplicate prices and models. Moving is a large change to the assistant route. See Complexity tracking. |

Library facts used: Radix Tabs and Select are already installed (`@radix-ui/react-tabs` ^1.1.12, `@radix-ui/react-select` ^2.2.5) and behave per their docs for keyboard navigation. `MediaRecorder`, `fetch` response streaming and `Blob` URLs are standard browser APIs.

## Complexity tracking

| Violation or extra moving part | Why needed | Simpler option rejected, and why |
|--------------------------------|------------|-----------------------------------|
| Pages import `@/routes/dashboard/assistant/providerCatalog` (a route directory) | Reuse of provider, model, language and price data (AC-24) without duplicating it | Copy the lists: duplicates prices and drifts. Move the file to `src/lib/`: touches the assistant route and its tests, out of scope. Revisit if a fifth consumer appears. |
| Services that return a `Response` or a `Blob`, not `{ ok, json }` | Streamed SSE and binary audio are not JSON (AC-7, AC-9) | Buffer the whole stream and return JSON: defeats progressive output and Stop. |
| Seven new files in `components/common/` | Each is used by all three routes (extraction bar is 3) | Three copies of each per route: rejected by the bar and by constitution #2. |
| `SnippetPanel` extracted from `ApiSnippetButton` | Existing sheet and three pages need the same inline snippet view | Write a second snippet view: duplicates language tabs, copy logic, secret toggle. The extraction must keep `ApiSnippetButton` behaviour byte-for-byte (existing tests are the guard). |

## Rollout and rollback

- **Blast radius:** additive. New routes, services, types and components; edits to three existing files only: `src/App.tsx` (3 routes), `src/routes/dashboard/navItems.ts` (3 entries), `src/lib/apiSnippet.ts` and `ApiSnippet.tsx` (optional-field extension and a pure extraction). No backend change, no new env var, no new dependency, no storage key, no request-shape change for existing endpoints.
- **Rollout:** ordered so each step is green on its own: (1) pure libs and types with tests, (2) services with tests, (3) snippet extension and `SnippetPanel` extraction with the existing `apiSnippet` and component tests still green, (4) shared components, (5) TTS page, LLM page, STT page, one at a time, (6) nav and routes last, so the pages are unreachable until complete, (7) README and `AGENTS.md` structure, sweep, report. No feature flag: the pages call only endpoints the production backend already serves, and nothing links to them until step 6.
- **Rollback recipe:** revert the change. Because nav and routes are the last step, a partial rollback is also safe: remove the three `navItems` entries and three `<Route>` lines and the pages disappear without touching anything else. Nothing is stored, so there is no data to clean up.
- **Risks to watch in verify:** custom response headers unreadable cross-origin (handled, AC-9); `MediaRecorder` MIME differences across browsers (handled by reading the actual type); a proxy that buffers SSE so text arrives in one block (the page still works, it just does not look progressive); `jsdom` has no `MediaRecorder` or `URL.createObjectURL`, so tests inject mocks through the hook.

## Change log

| Date | Change | Caused by |
|------|--------|-----------|
| 2026-11-08 | Created | AC-1 to AC-25 |
