# Report — Gemini knobs and duplex cost split (upstream 1.7.0)

**Plan:** [plan.md](../plans/2026-10-21-feature-gemini-duplex-cost-sync/plan.md) · **Progress:** [progress.md](../plans/2026-10-21-feature-gemini-duplex-cost-sync/progress.md) · **Research:** [research](../research/2026-10-21-feature-gemini-duplex-cost-sync.md)

## Changes
| Area | Change |
|---|---|
| Gemini realtime | Temperature and Max output tokens editable; the five refused knobs always sent as `null` |
| Call-log cost | Duplex rows read "Voice · GPT-Live" (session seconds) and "Backend model" (tokens); unpriced entries say "No rate" |
| Bug fixed | New duplex types `voice_llm_usage` / `backend_llm_usage` rendered as `VOICE_LLM` / `BACKEND_LLM` with no session metric |
| Webhook samples | Cascade, Realtime, Duplex, No answer, chosen with chips; costs sum to the call total |
| Service tier | Help text notes the 0.5x / 2x rates and that duplex scales the backend only |
| Layout | Assistant form no longer widens past the phone viewport when a sample is open |

## Verification
Tests 48/402 → 49/416 pass · typecheck clean · lint 82 (unchanged) · build ok · sweep 0 failing checks · 375 and 1440 screenshots in `agent-tracking/screenshots/2026-10-21-feature-gemini-duplex-cost-sync/`.

## Not verified
Live API behaviour (docs only); the cost popover in a browser; Gemini temperature range.
