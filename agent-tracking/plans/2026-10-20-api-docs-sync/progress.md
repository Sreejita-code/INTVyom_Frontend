# Progress — 2026-10-20-api-docs-sync

All steps done. Nothing committed.

| Step | Result |
|---|---|
| 1 Types | `duplex` mode, `backend_model`, `backend_instructions`, wizard types |
| 2 Catalogs | retired `gpt-5.1`/`gpt-5.4-nano` removed (stored value stays visible, replacement named); `gpt-6-*`, `gpt-realtime-2.1(-mini)`, `eleven_v4(_turbo)`, `bulbul:v4-flash` (224 speakers, per-model limits); ElevenLabs `voice_settings` pruned per model |
| 3 Duplex editor | mode card/accent, config repairs and payload, `LlmSection`, `AudioChain`, form guards, Chat disabled |
| 4 Usage | `session_duration` read into usage lines |
| 5 Template apply + wizard | services, condensers, `WizardProgress`, create via `/templates/{id}/apply` |
| 6 Schema diff | 3 read-only audits; fixes: passthrough status values, audio/passthrough bare-array tolerance, audio upload error text |

## Verification (2026-10-20)

- `npm run test`: 46 files, 388 tests pass (baseline 44/314)
- `npm run typecheck`: clean; `npm run lint`: 82 problems (= baseline); `npm run build`: ok
- driver sweep: 0 failing checks, 15 routes x 5 widths
- Custom browser run with stubbed API: duplex edit + create at 375 and 1440, no overflow, no console errors

## Found, not changed

- Call logs have no `call_status` column, `billable_duration_minutes` is dropped.
- Tool name pattern `^[a-z][a-z0-9_]*$`, max 100 / description 500 not enforced client-side.
- Analytics and tool response keys are loosely typed in the contract: UNVERIFIED against a live backend.
- `text_only` Chat is also refused for realtime assistants upstream; only duplex is guarded.

## 2026-10-21 follow-up

- "Replaces ..." hints removed from the gpt-6 rows.
- Pricing glimpse: `pricing.ts` (list prices + checked dates from the platform Pricing reference), `PriceBadge.tsx` (row price mark, tier dots, note under the select). Wired into LlmSection, ConfigField (STT/TTS model selects) and the TTS provider select. Test fails if an offered model has no price.
- Verified: 48 files / 402 tests, typecheck clean, lint 82 (= baseline), build ok, assistant route sweep 0 failing; browser shots at 375 and 1440 with no overflow or console errors.
