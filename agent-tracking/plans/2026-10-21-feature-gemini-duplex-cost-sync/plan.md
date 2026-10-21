# Plan — 2026-10-21-feature-gemini-duplex-cost-sync

**Status: awaiting approval.** No source file has been touched.

## Goal

Match the editor and call-log cost popover to upstream 1.7.0: Gemini realtime exposes only the two knobs it reads, and duplex calls show the GPT-Live voice cost apart from the backend model cost, read from `voice_llm_usage` / `backend_llm_usage` entries.

> **Revised after recheck (2026-10-21).** The first draft built the split on four top-level fields (`voice_model`, `backend_model`, `estimated_cost_voice_usd`, `estimated_cost_backend_usd`). Upstream withdrew them; they do not exist. Step 4 and 5 are rewritten, Q2 is dropped, and a live display bug is now Step 4's first fix.

## Success criteria

- No refused Gemini knob is ever sent as a non-null value, including from a stored row (test).
- Gemini realtime shows Temperature and Max output tokens; switching to or from Gemini clears the other five.
- A duplex call's cost popover labels the `voice_llm_usage` and `backend_llm_usage` rows Voice (GPT-Live) and Backend model, with session seconds and tokens respectively; their amounts sum to the total; an unpriced entry says "No rate", never $0.
- `npm run test`, `npm run typecheck`, `npm run build` green; lint not above the 82-problem baseline; sweep 0 failing checks.

## Questions (blocking)

1. **Gemini knobs.** Expose `temperature` and `max_output_tokens` for Gemini realtime? Recommended: yes. The docs give no Gemini-specific temperature range; I would reuse 0–2 and leave the API to reject.
2. ~~Split source~~ — resolved by the recheck: the split is two typed `model_usage` entries, no top-level fields.
3. **Service tier pricing.** Add a note on the service-tier help text (flex 0.5x, fast/priority 2x on tokens; duplex scales backend only)? Recommended: yes, text only.
4. **Webhook sample.** Add a duplex sample payload to the Developer page next to the cascade one? Recommended: yes.

## Steps

1. [ ] **Baseline** — `npm run test`, `typecheck`, `lint`, `build` against the AGENTS.md baseline; record in `progress.md`.
2. [ ] **Gemini knob rules** (`providerCatalog.ts`, `assistantConfig.ts`): add `GEMINI_KNOB_KEYS = ["temperature", "max_output_tokens"]`; in `buildAssistantPayload` send those two for Gemini realtime and `null` for the other five. Test: Gemini payload never carries a refused key non-null, including after hydrating a stored row that holds one.
3. [ ] **Gemini knob UI** (`LlmSection.tsx`): render the two knobs when `isRealtime && isGemini`; drop the "stored in every mode" wording on `CASCADE_LLM_FIELDS`. Reuse `ConfigField`; no new component.
4. [ ] **Types and service** (`callLog.ts`, `assistantService.ts`): keep the raw type (`llm`, `voice_llm`, `backend_llm`, `stt`, `tts`) and add `role: "voice" | "backend" | undefined` plus `mode` on `CallUsage`. Do not add the withdrawn top-level fields. Tests: duplex payload with `voice_llm_usage`/`backend_llm_usage`; pre-1.7.0 duplex row with two `llm_usage`; backend entry with no `estimated_cost_usd` plus `unpriced_model_usage`.
5. [ ] **Cost popover** (`CallLogCost.tsx`): `kindLabel` maps `voice_llm` to "Voice (GPT-Live)" and `backend_llm` to "Backend model"; `lineMetric` treats all three LLM types alike (session seconds for GPT-Live, tokens for backend); an unpriced line reads "No rate" instead of "—". Total stays `usage.estimatedCostUsd`. Other modes unchanged. Legacy two-`llm_usage` rows render as today.
6. [ ] **Pricing note** (`pricing.ts`/service tier help; Q3).
7. [ ] **Webhook sample** (`webhookSamples.ts`; Q4): add a duplex sample with `voice_llm_usage` / `backend_llm_usage`, `pricing_schema_version: 2`; refresh `sdk_version`; list all four `call_end_reason` values in the sample's note if one exists.
8. [ ] **Verify** — tests, typecheck, lint, build, `driver.mjs sweep`, plus a screenshot of the assistant editor (Gemini realtime) and call-logs popover (duplex, stubbed data) into `agent-tracking/screenshots/`.
9. [ ] **Docs** — README and AGENTS.md baseline numbers if tests change; sync `progress.md`; write `reports/<slug>.md`.

## Files expected to change

`src/routes/dashboard/assistant/{providerCatalog,assistantConfig,LlmSection,pricing}.ts(x)`, `src/routes/dashboard/call-logs/CallLogCost.tsx`, `src/types/callLog.ts`, `src/services/assistant/assistantService.ts`, `src/lib/webhookSamples.ts`, matching files under `tests/`.

## Risks and rollback

- Docs are not the live API: I cannot confirm that `null` for a refused knob is accepted on create. Mitigation: it is what the docs prescribe for clearing; first manual save of a Gemini assistant is the check.
- Gemini temperature range unknown. Mitigation: do not clamp tighter than the cascade 0–2.
- Rollback: one commit per step group; reverting restores today's behaviour (Gemini knobs nulled, single "LLM" label).

## Found on recheck

- Live bug: new duplex calls show `VOICE_LLM` / `BACKEND_LLM` and no GPT-Live session metric (see research). Fixed by Steps 4–5.

## Found, not planned

- Nothing in the current Gemini payload should error today; the change is a capability gap, not a break. If you are seeing a live error, send me the response body.
