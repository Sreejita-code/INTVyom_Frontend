# Plan — 2026-10-20-api-docs-sync

Task type: feature + contract alignment. Source of truth: MCP `intvoicekit-api-docs-prod`
(changelog 2026-10-20, `ASSISTANT-RULES`, swagger schemas).

## Agreed scope (user, 2026-10-20)

1. Duplex mode, built fully (types, catalogs, editor, guards, chain diagram, chips, webhook/call-log).
2. Template apply (`POST /api/assistant/templates/{id}/apply`) and the five wizard endpoints.
3. Field-by-field schema diff of every other endpoint, fix drift.
4. Nothing may break; test each step; verify UI in a real browser.

## Baseline (2026-10-20, before any change)

- `npm run test`: 44 files, 314 tests pass
- `npm run typecheck`: clean
- `npm run lint`: 82 problems (74 errors, 8 warnings)

## Steps (each leaves the repo green)

1. Types: `AssistantMode` + `duplex`; `AssistantLlmConfig.backend_model/backend_instructions`; `reasoning_effort` `max`.
2. Catalogs: drop `gpt-5.1`, `gpt-5.4-nano`; add `gpt-6-sol`, `gpt-6-luna`, `gpt-realtime-2.1(-mini)`,
   `eleven_v4(_turbo)`, `bulbul:v4-flash` (+ per-model rules); duplex model/voice/backend lists.
3. Duplex in editor: mode card + accent, `assistantConfig` repairs/payload/guards, `LlmSection`,
   `AudioChain`, `AssistantForm`, mode coercion in `assistantService` and `Assistant.tsx`.
4. Webhook samples + call-log types for `usage.mode: duplex`.
5. Template apply + wizard services, types, UI wiring.
6. Schema diff of remaining endpoints; fix drift.
7. Docs sync (README, AGENTS baseline), final baseline run, browser sweep.

## Not covered

No commit (user must ask). No backend changes.
