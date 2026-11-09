# Tasks — 2026-11-08-feature-standalone-stt-llm-tts

**Status:** approved (2026-11-08, by Shubham Halder)

**Spec:** specs/001-standalone-stt-llm-tts/spec.md
**Covers:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-21, AC-22, AC-23, AC-24, AC-25

## Goal

Add three dashboard pages (STT, LLM, TTS) where a signed-in user can try each standalone endpoint, copy working code, and read its full payload reference.

## Success criteria

- Each page: Try it, Code and Reference tabs; a successful call shows the result; each error status shows its message and hints.
- Snippets (cURL, Python, Node.js) reflect the current options and print `$VOICEKIT_API_KEY`.
- No existing route, nav entry or stored key changes behaviour (AC-22).
- `npm run test`, `npm run typecheck` and `npm run build` pass; lint count does not grow beyond the 82-problem baseline.
- `driver.mjs sweep` reports 0 failing checks at five widths, including the three new routes.

## Skills applied

- core-fe-workflow, core-fe-plan, core-fe-design-ui (design read and dials recorded in the plan)
- core-fe-verify-ui (sweep and screenshots)
- ui-design-system (tokens and utilities)
- react-service-structure (placement and service contract)
- core-fe-converge (final step)

## Steps

Setup and shared foundations first. Slices follow one per AC, test before code inside each slice.

- [x] 1. setup — Read the baseline: run `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`, and record exact output in `agent-tracking/plans/2026-11-08-feature-standalone-stt-llm-tts/progress.md`. Expect: 51 files, 426 tests pass; lint 82 problems.
- [x] 2. setup — Types: create `src/types/stt.ts`, `src/types/llm.ts`, `src/types/tts.ts` from the plan's Data model. Verify: `npm run typecheck`.
- [x] 3. setup — `src/lib/apiError.ts` with `ApiError` and `condenseApiError`. Test first in `tests/lib/apiError.test.ts`: string `error`, object `suggestions`, missing body, non-JSON body. Verify: `npx vitest run tests/lib/apiError.test.ts`.
- [x] 4. [P] setup — `src/lib/sseEvents.ts` (`parseSseChunk`, `deltaOf`, `[DONE]`). Test first in `tests/lib/sseEvents.test.ts`, including a frame split across chunk boundaries. Verify: `npx vitest run tests/lib/sseEvents.test.ts`.
- [x] 5. setup — Extend `src/lib/apiSnippet.ts` with optional `form`, `response` fields (multipart, stream, binary) and drop unset fields. Test first: add cases to `tests/lib/apiSnippet.test.ts`; existing cases must still pass unchanged. Verify: `npx vitest run tests/lib/apiSnippet.test.ts`.
- [x] 6. setup — Extract `SnippetPanel` from `ApiSnippetButton` in `src/components/common/ApiSnippet.tsx` with no behaviour change. Verify: existing `tests/components/common/` ApiSnippet tests pass unchanged, then `npm run test`.
- [x] 7. [P] setup — Shared components in `src/components/common/`: `PlaygroundShell.tsx`, `EndpointReference.tsx`, `UsageSummary.tsx`, `ApiErrorPanel.tsx`, `ProviderKeyField.tsx`, `AssistantPicker.tsx`. Each test-first in `tests/components/common/`. Covers AC-2 (shell tab and URL), AC-14 and AC-15 (reference, copy), AC-19 (picker), AC-10 (key field, not stored), AC-12 (error panel). Step is split as sub-tasks below.
  - 7a. AC-2 — `PlaygroundShell` with `?tab=` read/write, fallback to `try`. Test: `tests/components/common/PlaygroundShell.test.tsx`.
  - 7b. AC-14 and AC-15 — `EndpointReference` and copyable samples. Test: `tests/components/common/EndpointReference.test.tsx`.
  - 7c. AC-19 — `AssistantPicker` with list, none and load-error states. Test: `tests/components/common/AssistantPicker.test.tsx`.
  - 7d. AC-10 — `ProviderKeyField` as `type="password"`, no storage writes. Test: `tests/components/common/ProviderKeyField.test.tsx`.
  - 7e. AC-12 — `ApiErrorPanel` shows message, suggestions and next action. Test: `tests/components/common/ApiErrorPanel.test.tsx`.
- [x] 8. AC-11 — Services for all three endpoints in `src/services/stt/sttService.ts`, `src/services/llm/llmService.ts`, `src/services/tts/ttsService.ts`. Test first: extend `tests/services/bearerIdentity.test.ts` (each service sends `Authorization: Bearer`; a `401` clears the session) and add `tests/services/{stt,llm,tts}/` suites for body shape, `X-Provider-API-Key` header, `AbortError` handling. Verify: `npx vitest run tests/services tests/services/bearerIdentity.test.ts`.
- [x] 9. AC-9 — TTS result decoding: `condenseSynthesizeJsonResponse`, `condenseSynthesizeAudioResponse` (headers `X-TTS-*`, `X-Estimated-Cost-USD`, fallback `usage: null`). Test first in `tests/services/tts/`.
- [x] 10. AC-4 and AC-5 — `condenseTranscribeResponse`, nullable fields stay `null`. Test first in `tests/services/stt/`.
- [x] 11. AC-7 and AC-23 — LLM stream reader in the service: `callChatStreamEndpoint` returns the response; text deltas and raw events. Test first in `tests/services/llm/`. Covers AC-7 (non-stream reply and usage) through `condenseChatResponse`, and AC-23 (raw events view data).
- [x] 12. AC-13 — Snippet variants per page: `src/routes/dashboard/stt/sttSnippet.ts`, `src/routes/dashboard/llm/llmSnippet.ts`, `src/routes/dashboard/tts/ttsSnippet.ts`. Test first in each page's test file. Covers AC-13 (curl, Python, Node; stream and json/audio variants; placeholders).
- [x] 13. AC-14 — Reference content modules `sttReference.ts`, `llmReference.ts`, `ttsReference.ts`, each test-first: field list matches the documented request fields in the production API docs; error table covers 400, 401, 404, 413, 422, 502 for STT and the statuses in the docs for LLM and TTS.
- [x] 14. AC-8 and AC-25 — TTS page: `src/routes/dashboard/tts/Tts.tsx`, `TtsForm.tsx`, `TtsResult.tsx`, `index.ts`. Test first: `tests/routes/dashboard/tts/Tts.test.tsx`. Covers AC-8 (limits 1 to 5000, live counter), AC-8b (save-to-library off by default, warning when on), AC-9 (both formats; usage fallback), AC-16 (cancel, progress), AC-17 (empty and sample), AC-12 (error states).
- [x] 15. AC-24 — Suggested model, voice and language values from `providerCatalog.ts`, free text still accepted. Test first in `tests/routes/dashboard/tts/Tts.test.tsx`.
- [x] 16. AC-6 and AC-24 — LLM page: `src/routes/dashboard/llm/Llm.tsx`, `LlmForm.tsx`, `LlmResult.tsx`, `index.ts`. Test first: `tests/routes/dashboard/llm/Llm.test.tsx`. Covers AC-6 (message builder, empty-send block, temperature and max_tokens bounds), AC-24 (suggested models from `providerCatalog.ts`, free text still accepted).
- [x] 17. AC-7 — LLM stream UI: progressive text, Stop keeps partial text marked cut off, live region announces on pause. Test first in `tests/routes/dashboard/llm/Llm.test.tsx`.
- [x] 18. AC-3, AC-18 — STT page: `src/routes/dashboard/stt/Stt.tsx`, `SttForm.tsx`, `SttResult.tsx`, `useAudioRecorder.ts`, `index.ts`. Test first: `tests/routes/dashboard/stt/Stt.test.tsx`, mocking `MediaRecorder`. Covers AC-3 (types and 25 MB rejection before send) and AC-18 (permission denied and unavailable messages, file upload still works).
- [x] 19. AC-4, AC-5, AC-16, AC-17 — STT page: options omitted when unset, result with nullable and partial pricing, timer while recording, sample on empty. Test first in `tests/routes/dashboard/stt/Stt.test.tsx`.
- [x] 20. AC-10 — Wire `ProviderKeyField` into all three Try-it panels; test that `localStorage` and `sessionStorage` stay empty and the key does not appear in snippets unless "include keys" is on. Test first in each page's test file.
- [x] 21. AC-19 — Wire `AssistantPicker` into all three Try-it panels, with the "uses assistant settings for blank fields" note. Test first in each page's test file.
- [x] 22. AC-20 — Accessibility sweep on the three pages: accessible names, roles, focus return after Cancel, `role="alert"` on errors, Ctrl/Cmd+Enter in LLM message box. Assertions added to each page test file.
- [x] 23. AC-1 and AC-22 — Route and nav wiring, last so pages stay unreachable until complete. Edit `src/App.tsx` (three `<Route>` lines), `src/routes/dashboard/navItems.ts` (three entries under "Developers"). Test first: extend `tests/routes/dashboard/DashboardSidebar.test.tsx` and `CommandPalette.test.tsx`. Verify: `npm run test` full suite green (AC-22); `git diff --stat` shows no change to existing route files beyond `App.tsx` and `navItems.ts`.
- [x] 24. AC-21 — Responsive and theme check: `node .agents/skills/run-intvoicekit-frontend/driver.mjs sweep` at five widths, light and dark, screenshots into `agent-tracking/screenshots/2026-11-08-feature-standalone-stt-llm-tts/`. Verify: 0 failing checks; no horizontal scroll at 375 px.
- [x] 25. docs — Update `README.md` (three new routes, env unchanged) and `AGENTS.md` Repository structure section (new folders, `components/common` additions, `lib/apiError`, `lib/sseEvents`). Verify: `grep -n "stt\|llm\|tts" README.md AGENTS.md`.
- [ ] 26. docs — Update `agent-tracking/INDEX.md` row to `implemented` and write `agent-tracking/reports/2026-11-08-feature-standalone-stt-llm-tts.md`.
- [ ] 27. converge — Run `core-fe-converge` against `specs/001-standalone-stt-llm-tts/spec.md`. Every AC has evidence; drift scan; constitution re-check. Verify: `sh ~/.claude/skills/core-fe-workflow/scripts/sdd-check.sh converge 2026-11-08-feature-standalone-stt-llm-tts`.

Leftover from the 2026-11-08 converge (Not converged), plus the user's UI-polish request:

- [ ] 28. AC-24 — Suggested values everywhere, from `providerCatalog`: STT model + language datalists, LLM model datalist (openai cascade list; gemini per docs `api/llm.md`), TTS model + voice (Sarvam rosters) + language datalists. Free text stays accepted. Test first: rule helpers unit-tested, default-provider datalist rendered per page.
- [ ] 29. AC-17 — LLM sample ("starter conversation") button in the empty result state. STT's empty state keeps the record button + upload. Test first.
- [ ] 30. AC-20 — Focus returns to the send control after Cancel (STT, TTS) and after Stop (LLM). Test first.
- [ ] 31. AC-10 — Storage-write assertions in `Stt.test.tsx` and `Llm.test.tsx`, matching the TTS one.
- [ ] 32. ui — Polish pass (user request: pages "not smooth like others"): shadcn `Select` instead of native selects, spacing on the ui-design-system gap ladder (no `.5` tokens), consistent section cards, `PlaygroundShell` header matches sibling page headers (icon + `text-2xl font-bold tracking-tight`). No behaviour change; page tests must stay green.
- [ ] 33. AC-21 — Full sweep + eyeball screenshots of the three pages at 375 and 1920. Note: the app ships exactly one theme (dark, by design); nothing to sweep beyond it.

## Files expected to change

| Path | Change |
|------|--------|
| `src/types/stt.ts`, `llm.ts`, `tts.ts` | new |
| `src/lib/apiError.ts`, `src/lib/sseEvents.ts` | new |
| `src/lib/apiSnippet.ts` | extend with optional fields; existing callers unchanged |
| `src/components/common/ApiSnippet.tsx` | extract `SnippetPanel`, no behaviour change |
| `src/components/common/PlaygroundShell.tsx`, `EndpointReference.tsx`, `UsageSummary.tsx`, `ApiErrorPanel.tsx`, `ProviderKeyField.tsx`, `AssistantPicker.tsx` | new |
| `src/services/stt/sttService.ts`, `src/services/llm/llmService.ts`, `src/services/tts/ttsService.ts` | new |
| `src/routes/dashboard/stt/*`, `llm/*`, `tts/*` | new route folders (page, form, result, reference, snippet, index) |
| `src/App.tsx` | three `<Route>` lines |
| `src/routes/dashboard/navItems.ts` | three entries |
| `README.md`, `AGENTS.md` | docs sync |
| `tests/**` | mirrored suites listed per step |
| `agent-tracking/INDEX.md`, `progress.md`, `reports/…` | tracking |

## Design notes

- Design read and dials (core-fe-design-ui): plan.md, Design section. Workbench with three tabs; dials variance 3, motion 2, density 6.
- Components reused: `Tabs`, `Select`, `Switch`, `Slider`, `Accordion`, `Skeleton`, `Tooltip`, `Button`, `CopyIdButton`, `EmptyState`, `JsonSample`, `ApiSnippetButton` internals.
- Components added: see Files table; each has a stated reason in plan.md Reuse inventory.
- States per data view: loading, empty, error, partial data, cut-off stream (plan.md, States per view). Code and Reference tabs are static: N/A — no fetch.
- Screenshots: each page on Try it (empty, loading, success, error), Code, Reference, at 375, 768, 1024, 1440, 1920 px, light and dark.

## Design image (image tasks)

N/A — not an image task.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| TTS `X-*` usage headers unreadable cross-origin | Fallback to note pointing at `json` (AC-9); test in step 9 and 14 |
| jsdom has no `MediaRecorder` or `URL.createObjectURL` | Mock in test setup per page; hook is injectable |
| Browser MIME differences for recordings | Read actual MIME type; extension mapped from it (plan.md Behaviour rules) |
| Proxy buffers SSE | Page still works; text arrives in one block; not a failure |
| Lint count grows | Compare with 82-problem baseline in step 1; new files must add zero `any` |
| Cross-route import of `providerCatalog` | Recorded in plan.md Complexity tracking; revisit at a fifth consumer |
| `ApiSnippetButton` extraction changes behaviour | Existing tests are the guard (step 6) |

## Delivery and rollback

See core-fe-workflow/references/SAFE-DELIVERY.md.

- **Blast radius:** the three new pages only; the existing snippet sheet if step 5 or 6 is wrong.
- **Rollout:** new routes land last (step 23), so pages are unreachable until complete.
- **Rollback recipe:** revert the change; or remove the three `navItems` entries and three `<Route>` lines. No env var, dependency, storage key or backend contract changes.

## Verification

| Command | Expected |
|---------|----------|
| `npm run test` | all suites pass; baseline 426 plus new tests |
| `npm run typecheck` | clean |
| `npm run lint` | no more than 82 problems; new files add none |
| `npm run build` | succeeds; chunk warning unchanged or lower |
| `node .agents/skills/run-intvoicekit-frontend/driver.mjs sweep` | 0 failing checks across 18 routes × 5 widths |
| `sh ~/.claude/skills/core-fe-workflow/scripts/sdd-check.sh ci` | tasks cover every active AC |

## Plan changes after first draft

- 
