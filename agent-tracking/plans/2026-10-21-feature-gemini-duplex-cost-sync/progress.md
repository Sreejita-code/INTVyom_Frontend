# Progress — 2026-10-21-feature-gemini-duplex-cost-sync

Approved by the user on 2026-10-21: yes to Gemini knobs, yes to the service-tier note, yes to samples for every mode.

- Baseline: 48 files / 402 tests pass, typecheck clean, lint 82 problems (74 errors, 8 warnings).
- Step 4–5: `voice_llm_usage` / `backend_llm_usage` parsed as `type: "llm"` plus `role`; popover labels "Voice · GPT-Live" and "Backend model"; entries with no rate read "No rate".
- Step 2–3: Gemini realtime sends `temperature` and `max_output_tokens` as set and the other five as `null`; `LlmSection` shows the two knobs.
- Step 6: service-tier help text notes flex 0.5x, fast/priority 2x, duplex scales backend only.
- Step 7: `END_CALL_WEBHOOK_SAMPLES` (cascade, realtime, duplex, no answer) with costs that add up; `JsonSample` gained `variants` chips.
- Layout fix found by the 375px check: the assistant form's section grid (`AssistantForm.tsx:78`) had an auto track, so the webhook sample's `<pre>` widened the card to 858px inside a 343px column and clipped the text. Now `grid-cols-[minmax(0,1fr)]`; card is 343px.
- Lint: two new `no-explicit-any` errors introduced and removed; back to 82.
- After: 49 files / 416 tests pass, typecheck clean, lint 82, build ok, sweep 0 failing checks.
- Docs: `AGENTS.md` baseline refreshed (49 files, 416 tests). README unchanged (no script, env, dependency or folder change).

## Out-of-scope observations

- Not verified against the live API: only the docs MCPs were used. First Gemini save is the real check that `null` for the five refused knobs is accepted.
- The call-log cost popover was covered by tests, not a browser screenshot (needs call-log data the driver stubs out).
- Gemini temperature range is unconfirmed; the slider reuses 0–2.
