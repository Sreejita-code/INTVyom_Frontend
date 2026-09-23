# API Contract Alignment + Commit Follow-up — Tracking Plan

**Tracking file:** on approval, copy this plan to `plan/api-contract-alignment.md` in the repo,
matching the format of `plan/ui-rebrand.md` and `plan/ui-uniformity.md`. Tick boxes there as
work lands. Backend requests go in a second file, `plan/backend-requests.md`.

## Context

Commit `aa9880f` ("Refactored authentication and added gemini realtime") moved identity to
`Authorization: Bearer <api_key>` through `src/services/auth/authedFetch.ts`. It also changed
the Gemini, STT and TTS catalogs, added `assistant_end_call_webhook` tuning, and hid SIP
credentials.

An audit compared the commit and the rest of the frontend against three sources:
- the backend swagger (`intvyom-api-docs-local` MCP),
- the backend source (`../INTVyom_Backend`),
- the upstream Vyom docs (`api-livekit-docs` MCP).

It found:
- features broken now by key-only auth and by the backend withholding `trunk_config`,
- bugs introduced by the commit,
- older contract gaps,
- duplication and design-system breaches,
- repo hygiene problems,
- backend capabilities the frontend does not use.

**Corrections from the audit — do NOT change these; the frontend is already right:**
- Web-call token: upstream returns `data.token`. The swagger's `room_token` is wrong.
- Assistant list and details: upstream returns `data.assistants[]` and `data.assistant_*`.
  The swagger's bare `name`/`llm_mode` shape is the local Mongo doc, not the API response.
- Integration resync-status: the backend returns `total`, `processed`, `succeeded`,
  `failed[]` and `error`. The swagger omits them. One gap: `status` can also be `"interrupted"`.

**Decisions taken with the user:**
- Frontend only. Backend changes are written up as requests, not made.
- Remove `user_id` from every request now.
- Provider keys are masked in the UI.
- A new assistant starts as realtime + Gemini (`gemini-3.8-live`, `Puck`).
- Adopt `/validate`, server-side search, per-assistant billable minutes and templates.
  Skip the wizard.

Repo rules that apply throughout (AGENTS.md): the `call`/`condense` pattern, `@/` imports, no
new comments unless they document backend behavior, no dead code, `plan-before-implement`
one step at a time, `ui-design-system` for UI, and `run-intvoicekit-frontend` to verify UI work.
No commits unless the user asks.

**Baseline (2026-09-22):**
- typecheck clean
- 246/246 tests pass
- lint: 88 problems (80 errors, 8 warnings)
- build ok, ~1.90 MB bundle
- driver sweep: 0 failing checks

**Every phase ends with:** `npm run typecheck`, `npm run test`, lint at 88 problems or fewer,
and a driver `sweep`/`route` run for any UI touched.

---

## Phase 0 — Setup and live-shape check

- [x] Copy this plan to `plan/api-contract-alignment.md`.
- [x] Test key stored at `~/.intvyom_test_key` (600). It was pasted in chat, so rotate it after testing.
- [x] Live shapes checked against `http://localhost:3000` on 2026-09-22. They match the current
  condensers, so none change:
  - `assistant/list`: `data.assistants[]` + `data.pagination{total,page,limit,total_pages}`.
    `assistant_name`, `sort_by` and `sort_order` filter server-side.
  - `audio/list`: `data.audios[]` + `data.pagination`.
  - `passthrough-call/call-records`: `data.records[]` + `data.pagination`.
  - `assistant/call-logs/{id}`: `data.logs[]` + `data.pagination`.
  - `assistant/details/{id}`: `data.assistant_*`, and it DOES return
    `assistant_end_call_webhook` (a round-trip of 45/4 was verified).
  - `web-call/get-token`: `data.{room_name, token, agent_dispatch}`.
  - `sip/list`: `data[]` with no `trunk_config`.
  - `platform-billable-minutes/download`: 200 xlsx with the bearer key, 401 without it.
    Header: `Content-Disposition: attachment; filename=platform_billable_minutes.xlsx`.
  - `assistant/validate`: checks the mode/provider matrix only (an unknown model passes).
    When invalid, the reason is in `message` and `data.suggestions`.
  - `assistant/templates`: `data[{id,name,description}]`, with four ids: `cascade-multilingual`,
    `customer-support`, `pipeline-basic`, `realtime-gemini`.
  - `templates/{id}`: `data.configuration` holds the mode/llm/tts/stt/interaction config,
    with no name, prompt or description. So Phase 9 prefills the editor from it instead of
    calling apply.
  - `billable-minutes/{id}`: `to_number` is required (400 without it). Returns
    `data.total_billable_minutes`.
  - `assistant/create`: `assistant_description` is required (422).
- [x] Probe assistant `phase0-probe` was created for end-to-end checks and deleted on 2026-09-23.

## Phase 1 — Backend requests doc (no backend code)

Write `plan/backend-requests.md` for the backend team. Evidence is from `../INTVyom_Backend`.

- [x] SIP list/details: return an allow-list of `trunk_config` keys (`address`, `numbers`,
  `exotel_number`) and never `username`/`password`. Today it is `.select('-trunk_config')` at
  `src/sip/sip.service.js:56` and `delete safeTrunk.trunk_config` at `:80`.
- [x] **Security:** `POST /api/sip/create-outbound-trunk` returns the saved doc with
  `trunk_config` credentials (`sip.routes.js:18-21`). Strip them.
- [x] **Security:** `GET /api/integration/get` returns the plaintext provider key
  (`integration.routes.js:49`). Return `api_key_preview`, as `/store` already does.
- [x] Swagger fixes:
  - web-call returns `data.token`, not `room_token`.
  - Assistant list/details return the upstream `data.*` shapes.
  - Document the resync-status fields and the `interrupted` status.
  - Document that `POST /assistant/create` returns the local doc with bare keys.
- [x] Error handler drops validation `suggestions` (`errorHandler.js:21`). Ask for them to
  pass through.
- [x] Call-logs "assistant not found" returns 500. It should be 404.

## Phase 2 — Features broken now

- [x] **Billable-minutes download** (`Analytics.tsx:297`):
  - Replace `window.open` with a new `callDownloadPlatformBillableEndpoint` in
    `analyticsService.ts`.
  - It calls `authedFetch` and returns the Blob.
  - The page saves it through an object URL and `<a download>`, and shows `toastError` on
    failure.
- [x] **Passthrough records** (`PassthroughCallRecords.tsx:122`): send `page` instead of
  `offset`. Fix the condenser only if Phase 0 shows a different shape.
- [x] **Inbound picker** (`Inbound.tsx:120`):
  - Stop filtering on `trunk_config?.exotel_number`. List every Exotel trunk.
  - Pre-fill the number when `trunk_config?.exotel_number` exists. Otherwise the user types
    the number, validated as E.164-ish, using the existing combobox with free text allowed.
  - This keeps working after the backend change in Phase 1.
- [x] **Trunk details** (`PhoneNumber.tsx:598-671`): render the address, numbers and Exotel
  number only when present. Otherwise show one neutral line: "Numbers aren't shown for this
  trunk yet."
- [x] **Signup with a null `api_key`** (`Auth.tsx`): don't store the session or navigate.
  Show a toast saying the account was created but key issuance failed, so sign in again or
  contact support.
- [x] **Audio list**: fix the condenser only if Phase 0 shows `data[]`. Use `toastError`
  (`json.error`) instead of `node.message`.
- [x] Also fixed: the passthrough pager buttons never refetched, and Clear refetched with the old
  filters (a stale closure). Query building moved into `callCallRecordsEndpoint(query)`.
- [x] Also: `condenseAuthResponse` (from Phase 6) landed here; `AuthResponse*` types deleted.
- [x] Also: `driver.mjs` now kills its dev-server process group (from Phase 8).
- [x] Gate: 262/262 tests, typecheck clean, lint 84 (was 88), driver `route` 0 failures on
  analytics, passthrough-call-records, inbound, phone-number, audio-library, auth.

## Phase 3 — Bugs from commit `aa9880f`

- [x] **End-call webhook inputs** (`AssistantForm.tsx:735-770`):
  - `step={1}`.
  - Validate integers in range (1–120 and 1–5) in `buildAssistantPayload`'s validation path,
    so save is blocked with a message.
  - `aria-invalid` plus an inline error.
  - Placeholders read "Default: 30" and "Default: 3".
  - Disable the inputs while `assistant_end_call_url` is empty.
  - `gap-1.5` → `gap-2`.
- [x] **Stale Gemini model or voice on load:** run the model/voice repair from
  `repairLlmForMode` (`assistantConfig.ts:181`) inside `hydrateForm`. Existing assistants
  whose model or voice was dropped then show the default instead of a blank select. Add a
  test.
- [x] **ElevenLabs speed:** `pruneTts` (`assistantConfig.ts:~296`) also drops `speed` for
  `eleven_v3_conversational`. Put the "no speed" list in one place and have both `pruneTts`
  and `ttsInertReason` read it. Remove the stale comment at `providerCatalog.ts:770`.
- [x] **Credentials switch** (`ApiSnippet.tsx`):
  - Disable it when there is no `api_key`.
  - Helper text covers both states: Off prints the placeholder, On warns that real secrets
    are shown.
  - After Phase 4 the switch only reveals the key.
- [x] **Developer copy** (`Developer.tsx`):
  - Line 110, the Base URL card: say the API key identifies you.
  - The User ID row becomes a non-secret account reference: drop `secret` and the eye toggle.
  - Merge the "LiveKit key" chip into the API key chip.
  - Title "Your API Keys" → "Your API key".
  - Add a sign-out action next to the no-key message.
- [x] **New-assistant default** (`constants.ts:7-12`): realtime + `provider: "gemini"`,
  `model: "gemini-3.8-live"`, `voice: "Puck"`. Update any test that pins the old default.

## Phase 4 — Remove `user_id` everywhere

The backend ignores `user_id`; identity comes from the bearer key.

- [x] Services: drop the `userId` params and the `user_id` query/body/FormData fields in
  - `sip`, `tool`, `inbound`, `inboundContext`, `integration`, `audio`, `call`
  - `assistant`, `analytics` (`buildAnalyticsQueryParams`), `webCall`, `meetingCall`
  - `passthroughCall`
  - `callDeleteTrunkEndpoint` sends no body.
- [x] Routes: replace `if (!user?.user_id)` guards with a signed-in check on the key, using
  `getStoredApiKey()` from `authedFetch.ts`. There are about 50 guards across
  `Assistant.tsx`, `MakeCall.tsx`, `Inbound.tsx`, `InboundContext.tsx`, `PhoneNumber.tsx`,
  `Tools.tsx`, `AudioLibrary.tsx`, `Integrations.tsx`, `Analytics.tsx`, `CallLogs.tsx`,
  `PassthroughCallRecords.tsx`, `MeetingCallTab.tsx` and `useAssistantList.ts`. Update the
  hook dependency arrays to match.
- [x] Snippets:
  - Delete `USER_ID_PLACEHOLDER` (`src/lib/apiSnippet.ts:35`) and every use of it.
  - Remove `user_id` from `developerActions.ts`.
  - Remove the hardcoded `$VYOM_USER_ID` in `webCallGuideSteps.ts:61,162,262`.
- [x] Keep `user_id` in storage and on the Developer page (account reference) and the sidebar.
- [x] Update the tests that assert `user_id` in URLs or bodies.

- [x] Also done: the `EndCallWebhookTuning` type, `normalizeEndCallWebhook`, and one
  `END_CALL_WEBHOOK_FIELDS` list shared by validation and the UI (from Phase 6). Gemini defaults
  are now `GEMINI_DEFAULT_MODEL`/`GEMINI_DEFAULT_VOICE` with `isGeminiModel` (from Phase 6).
  Gemini hints are corrected from upstream `reference/models.md`.
- [x] Gate: 277/277 tests, typecheck clean, lint 84, driver sweep 0 failures.

## Phase 5 — Contract robustness (older gaps)

- [x] New `src/lib/readJson.ts`: `readJson(res)` returns the parsed JSON, or
  `{ error: "<status> <statusText>" }` when the body is not JSON. It is pure (takes a
  `Response`) and replaces the raw `await res.json()` in every service.
- [x] Errors that are swallowed today now show `toastError`:
  - `PhoneNumber.tsx:71`
  - `Inbound.tsx:108,118`
  - `Tools.tsx:101`
  - `Integrations.tsx:59`: only a 404 means "no job".
  - `Integrations.tsx:102`: only a 404 means "not connected".
  - `MakeCall.tsx:251`: stop polling and show a note after N failures.
- [x] Integrations:
  - ~~Add a `condenseResyncStatus` and handle `interrupted`~~ Already handled in the UI, so no
    condenser is needed. Resync-status now reports its HTTP status: only a 404 means "no job".
  - Show the provider key as a masked preview only (`***` + last 4), never in full; the
    reveal toggle goes.
- [x] Audio upload (`AudioLibrary.tsx:120`): `transcript` is required, with a form validation
  message.
- [x] Tool `static_return` (`Tools.tsx:119,163`): edit as JSON text. Parse it on save, show
  an error when invalid, and send the parsed value.
- [x] Assistant types:
  - `keyterm: string | string[]`
  - ~~add `tool_ids` to the LLM config type~~ Dropped: upstream details return `tool_ids` at the
    top level, not inside the LLM config, so the swagger note was wrong.
  - allow any BCP-47 language (Deepgram) and any ISO 639-1 language (OpenAI) in validation
  - ~~widen `preferred_languages` beyond the 11 Bulbul codes~~ Skipped: it only hints the
    native transcription prompt, and nobody has asked for a code outside the list.
  - delete the dead `nova-2` keyterm branch
- [x] Also found and fixed (from upstream `reference/models.md`):
  - `saaras:v4` was treated as `codemix`-only, and `mode` was dropped for it. Both current
    Sarvam models read every mode.
  - The STT `validModels` lists are now derived from the catalog (from Phase 6).
- [x] Gate: 295/295 tests, typecheck clean, lint 82.

## Phase 6 — Standards and duplication cleanup

- [x] **Single source of truth for Gemini models:** export `GEMINI_DEFAULT_MODEL` from
  `providerCatalog.ts`. `assistantConfig.ts:184-185` and `LlmSection.tsx:43` derive from
  `GEMINI_LIVE_MODELS` instead of repeating it.
- [x] **STT model lists:** the `validModels` arrays in `getSttModelError`
  (`providerCatalog.ts:686-755`) are derived from each provider's catalog `options`.
- [x] **End-call webhook type:** name it (`EndCallWebhookTuning` in `src/types/assistant.ts`)
  and add one `normalizeEndCallWebhook()`. It is used by `constants.ts`, `hydrateForm`,
  `buildAssistantPayload` and `updateEndCallWebhook`.
- [x] **`apiSnippet.ts`:** one `headerEntries(spec, options)` shared by curl, Python and Node.
- [x] **Auth condense:** `condenseAuthResponse` in `authService.ts`. `Auth.tsx` stops casting.
  Merge `AuthResponseUser` into `AuthUser` (differs only by `id` vs `user_id`).
- [x] **`authedFetch.ts`:** remove the `typeof window` guard and the unused
  `Authorization`-override branch. Keep `getStoredApiKey`, which Phase 4 now uses.
- [x] **Comments:** remove the three that break the AGENTS.md comment rule (`Index/index.ts`,
  `authedFetch.ts` redirect loop, `apiSnippet.ts` `apiKey` JSDoc).
- [x] **Dead code:** delete the `validation_errors` branches in `assistantService.ts:87,108`.
- [x] Gate: 293/293 tests, lint 82.

## Phase 7 — UI polish (ui-design-system)

- [x] Twilio and Exotel trunk block (`PhoneNumber.tsx`):
  - `text-[10px]` → a token size
  - `rounded-xl` → `rounded-lg`
  - collapse the one-child `p-8 space-y-8` wrapper
  - phone numbers in `font-mono`
  - the TWILIO chip must not stretch at 375 px
- [x] Developer "NOT A SECRET" chip: `whitespace-nowrap`.
- [x] `FieldRow`:
  - `Label htmlFor`, with the control id passed through
  - arbitrary `text-[0.9375rem]`/`text-[0.8125rem]` → tokens
  - `amber-500` → the warning token
- [x] Realtime blurb: fix "no separate… voice", since a Voice field is shown.
- [x] Gemini `extended-thinking` hint states farewell and reprompt support, like the others.
- [x] Screenshots at 375 and 1280 px of every touched surface, reviewed.
- [x] Also found live: the Inbound picker's popover lost focus inside the assign dialog (typed
  digits went nowhere) and was 1px wider than a 375px screen. It was replaced by a native
  `<input type="tel">` with a `<datalist>`, which has no portal and no focus fight.
- [x] Realtime copy fixed in `LlmSection.tsx`, `AudioChain.tsx` and `lib/assistantModes.ts`.

## Phase 8 — Repo hygiene

- [x] `git rm --cached tsconfig.app.tsbuildinfo tsconfig.node.tsbuildinfo`, and add
  `*.tsbuildinfo` to `.gitignore`.
- [x] `opencode.json`: remove the developer-local `voicekit-backend` (`localhost:8002`)
  entry and restore the trailing newline. Ask before touching `.mcp.json`, which has the
  user's own uncommitted edit.
- [x] `driver.mjs:43,138`: spawn `npm run dev` with `detached: true` and kill the process
  group (`process.kill(-proc.pid)`), so `vite` no longer stays on port 8080.
- [x] AGENTS.md Baseline: refresh the counts. Note that the `apiSnippet` Python test passes
  when `python3` is present.

## Phase 9 — New backend capabilities

- [x] **Pre-save validate:**
  - `callValidateAssistantEndpoint` in `assistantService.ts` (`POST /api/assistant/validate`
    returns `data: { is_valid, suggestions }` and is always 200).
  - Run it on save before create/update.
  - Show the suggestions inline and block when invalid.
  - Keep the local `getProviderModeError` checks for instant feedback.
- [x] **Server-side assistant search:** `useAssistantList.ts` sends `assistant_name`, debounced
  300ms and reset to page 1. It replaces the client filter, which only searched loaded pages.
  `sort_by`/`sort_order` were skipped: the list has no sort control to drive them.
- [x] **Per-assistant billable minutes:** `callAssistantBillableMinutesEndpoint`
  (`GET /api/assistant/billable-minutes/{id}`) shown on the assistant detail pane, with an
  optional `to_number` filter.
- [x] **Templates:** (implemented as a prefill, not `apply`, because the template carries no
  name or prompt)
  - `callListTemplatesEndpoint`, `callGetTemplateEndpoint` and
    `callApplyTemplateEndpoint`, with condensers.
  - On New Assistant, offer "Start from template". The list comes from `data[{id, name,
    description}]`.
  - Apply returns the local doc (bare keys): navigate by `external_assistant_id` and reload
    details, rather than hydrating from that response.
- [x] Tests for each new service `call`/`condense`, plus one route test per surface.
- [x] Live-verified against `localhost:3000`:
  - templates prefill the editor (pipeline chosen, so the Voice stage appears);
  - the Minutes popover returns `0 billable minutes`;
  - saved webhook tuning round-trips;
  - no requests carry `user_id`, and every request carries the bearer key.
- [x] Final gate: 43 files / 303 tests pass, typecheck clean, lint 82 (was 88), build ok, driver
  sweep 0 failures across 15 routes × 5 widths.

## Verification

- Per phase: typecheck clean, all tests pass (new tests added), lint at 88 problems or fewer,
  `npm run build` ok.
- UI phases (2, 3, 5, 7, 9):
  - `node .agents/skills/run-intvoicekit-frontend/driver.mjs sweep` reports 0 failing checks.
  - Screenshots of the touched surfaces at 375 and 1280 px.
- End to end against the local backend (`http://localhost:3000`) with the test key:
  - log in
  - list and open an assistant
  - save an invalid webhook tuning (blocked) and a valid one (persists)
  - start a web chat (token ok)
  - download billable minutes (xlsx saved)
  - page 2 of passthrough records differs from page 1
  - assign an Exotel number by typing it
  - create an assistant from a template
  - a 401 with a bad key redirects to `/auth`
- `grep -rn "user_id" src/services` shows no request usage.
- `git status` shows no `*.tsbuildinfo` churn after `tsc -b`.
