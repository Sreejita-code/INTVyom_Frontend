# Research — 2026-10-21-feature-gemini-duplex-cost-sync

Sources: `intvoicekit-api-docs-prod` MCP (`get_changelog`, `get_dev_doc ASSISTANT-RULES`) and `api-livekit-docs` MCP (`changelog.md`, `api/calls/webhook.md`, `api/assistant/logs.md`, `reference/models.md`, `reference/pricing.md`). Both are docs only; neither can confirm live API behaviour.

## Upstream 1.7.0 (2026-10-21)

1. **Gemini realtime refuses knobs it ignores.** With `assistant_mode: realtime` and provider `gemini`, `reasoning_effort`, `verbosity`, `service_tier`, `tool_choice`, `parallel_tool_calls` are a 400 here (422 upstream). Only `temperature` and `max_output_tokens` reach Gemini Live. A stored row holding one is refused on its next LLM-config edit until the field is sent as `null`. A request that does not touch `assistant_llm_config` is not judged here, but upstream still 422s while the knob stays.
2. **Duplex cost split (CORRECTED on recheck).** The first pass reported top-level `voice_model`, `backend_model`, `estimated_cost_voice_usd`, `estimated_cost_backend_usd`. The docs were revised the same day and the prod changelog now says **those keys do not exist**. The split is in `model_usage`: two entries typed `voice_llm_usage` (GPT-Live, billed by `session_duration`) and `backend_llm_usage` (backend model, billed by tokens), each with its own `estimated_cost_usd`. Duplex calls recorded before 1.7.0 keep `llm_usage` on both. A model with no rate has no `estimated_cost_usd` and is listed in `unpriced_model_usage` (never `0`). Analytics `GET /analytics/tokens/by-model` rows also use the new types.
   `pricing_schema_version` is `2` for 1.7.0+ calls (tiers priced).
4. **`call_end_reason`** now lists `natural`, `end_call_tool`, `silence_timeout`, `max_duration_exceeded`.
3. **Service tiers are priced.** `flex` 0.5x, `fast`/`priority` 2x on token rates. In duplex the tier scales the backend only, never GPT-Live ($0.05/min).

## What the frontend does today

- **Gemini payload is already safe.** `buildAssistantPayload` (`assistantConfig.ts:533-538`) sends all seven `CASCADE_LLM_FIELDS` as `null` outside cascade/duplex, so no refused field reaches the API. `hydrateForm` keeps stored knobs in form state but they are not sent. No 400 is expected from the current payload. Not verifiable without a live call.
- **Gap:** `temperature` and `max_output_tokens` are also nulled for Gemini, so users cannot set the two knobs Gemini now honours. `LlmSection.tsx` only renders knobs when `readsKnobs` (cascade or duplex).
- **BUG found on recheck: new duplex calls render wrong today.** `condenseUsageLine` ([assistantService.ts:186](src/services/assistant/assistantService.ts#L186)) strips `_usage`, so `voice_llm_usage` becomes `voice_llm` and `backend_llm_usage` becomes `backend_llm`. `CallLogCost.tsx` only matches `type === "llm"`: `kindLabel` prints `VOICE_LLM` / `BACKEND_LLM`, and the GPT-Live `session_duration` line falls through `lineMetric` and shows no metric. Tests only cover `llm_usage`, so nothing catches it.
- The split needs no new top-level fields: per-line `estimatedCostUsd` and `sessionDuration` are already parsed. Only the type names need mapping.
- Unpriced handling: `pricingComplete` already false when `unpriced_model_usage` is non-empty, so the popover shows "Pricing incomplete"; the per-line amount shows "—" (no `estimated_cost_usd`). Correct, but not attributed to the line.
- `src/lib/webhookSamples.ts` has only a cascade sample (`sdk_version: "1.7.1"`, `llm_usage` only, no duplex block, no `pricing_schema_version`); the Developer page renders it.
- `pricing.ts` already has `DUPLEX_VOICE_PRICE` ($0.05/min) and `gpt-6-*`; no service-tier multiplier note anywhere.

## Doc gaps found

- `logs.md` says `usage.mode` is `pipeline`, `realtime` or `cascade`; `duplex` is missing there (upstream doc gap, not ours).
