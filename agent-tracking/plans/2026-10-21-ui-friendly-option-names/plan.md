# Plan — 2026-10-21-ui-friendly-option-names

**Status: awaiting approval.** No source file touched.

## Design read (core-fe-design-ui, Step 1)

- **Product and user:** people building a voice assistant who pick a voice by how it sounds and who it is for, not by an API id.
- **Job of this screen:** choose a speaker quickly out of 224 without decoding `ritu_hi_customer_utility`.
- **Mood:** clear, calm, precise.
- **Dials:** variance 3, motion 2, density 6. Same product, no restyle.

## What exists

- `FieldOption { value, label, hint }` already separates the id sent to the API (`value`) from the text shown (`label`), so no payload code changes. `OptionRow` renders `label` plus an optional `hint` line.
- Speaker lists are built with `asOptions(codes)`, which sets `label = value` ([providerCatalog.ts:126](src/routes/dashboard/assistant/providerCatalog.ts#L126)). That one helper is why every id shows raw.
- The 224 v4-flash names all follow `<voice>_<language>_<style>`: 11 language tags (`as bn en enhi gu hi kn mr pa ta te`), about 50 distinct styles. Hindi alone has 116 entries, in one flat unsorted-looking list.
- `asNamedOptions` already shows `hi — Hindi` for ElevenLabs STT languages, so the pattern is accepted.
- `cmdk` and `src/components/ui/command.tsx` are installed (used by the ⌘K palette).

## Proposal

**The map.** One new pure module, `src/lib/optionNames.ts` (name by what it does, per AGENTS.md; no `utils`):
- `SPEAKER_LANGUAGES`: `hi` to "Hindi", `enhi` to "Hinglish", and so on.
- `SPEAKER_STYLES`: `customer_utility` to "Customer support, utility", `edtech` to "Education", `devotional` to "Devotional", and so on. About 50 entries, written once.
- `friendlySpeaker(id)`: splits the id, title-cases the voice, looks up language and style. An id the map does not know falls back to title-cased words, so a new upstream speaker never renders blank or crashes.
- Example: `shubh_hi_customer` becomes **Shubh · Hindi · Customer support**, with `shubh_hi_customer` kept as small mono text.

**The rule that keeps the API safe.** Only `label` and `hint` change. `value` stays the raw id, in `onValueChange`, the payload, hydrate and validation. A test asserts that selecting a friendly row calls `onChange` with the exact raw id, for every one of the 224 and the 30 v3 speakers.

### Design directions (Step 3)

| | A. Relabel | B. Grouped (recommended) | C. Grouped + search |
|---|---|---|---|
| Row | friendly name, raw id as mono hint | same | same |
| Long lists | flat | headers by language ("Hindi · 116"), voices A–Z inside | same, plus a search box |
| Trigger (closed) | friendly name | friendly name | friendly name |
| Effort | small | small–medium (`SelectGroup`, already in `select.tsx`) | medium (`Command` combobox, ~mobile keyboard care) |
| Signature detail | none | language group headers make 224 scannable | type "hindi news" and land on it |

Reference for the two-line row with a muted secondary id: the existing `OptionRow` price rows and the repo's own ⌘K palette. External references (Linear, Raycast, Vercel pickers) not yet screenshotted; I'll gather them when you pick a direction, per the skill.

**Beyond Sarvam** ("if something else is also present"). Candidates found:
1. Language codes: `hi-IN`, `unknown`, `en-US`, `hin` shown raw in Sarvam, Cartesia, Deepgram and OpenAI selects. Use `Intl.DisplayNames` (already used), so no table: "Hindi (India)", "Auto-detect".
2. Gemini voices (`Achernar`, `Zubenelgenubi`): proper names, no map needed. Optional one-line character hint such as "Firm" is a different feature.
3. Sarvam v3 speakers (`shubh`, `ritu`): title-case only ("Shubh").
4. Model ids (`gpt-6-luna`, `bulbul:v4-flash`): left alone. They are the product names users search docs for.
5. Free-text `voice_id` (ElevenLabs, Cartesia, Mistral) are opaque ids with no roster to map.

## Steps (after approval)

1. [ ] Baseline: tests 49/416, typecheck, lint 82, sweep 0.
2. [ ] `optionNames.ts` with the two maps and `friendlySpeaker`; tests: every one of the 224 ids gets a non-raw label, unknown id falls back, raw value untouched.
3. [ ] Use it in `ttsFieldsFor` (v4-flash and v3 speakers) so options carry `label` and raw-id `hint`.
4. [ ] Direction B: group the v4-flash options by language; check `ConfigField` renders groups and the closed trigger shows the friendly label.
5. [ ] Language-code labels via `Intl.DisplayNames` (if Q1 includes them).
6. [ ] Tests: selection sends the raw id; payload for a stored raw speaker unchanged.
7. [ ] Verify with `core-fe-verify-ui`/driver at 375, 768, 1024, 1440, 1920; read the 375 and 1920 screenshots of the open list; critique and ideas in `progress.md`.
8. [ ] Docs: baseline in `AGENTS.md`, `src/lib` listing in `AGENTS.md` (new file), report.

## Questions

1. **Scope:** Sarvam speakers only, or also language codes (item 1)? Recommended: speakers plus language codes.
2. **Direction:** A, B or C? Recommended B now; C only if the 224-item list still feels slow, since it adds a combobox to maintain.
3. **Naming style:** "Shubh · Hindi · Customer support" (voice, language, use). OK, or prefer "Shubh (Hindi, customer support)"?

## Risks and rollback

- A wrong label is cosmetic, because the value is untouched. The map can only mislead, not break a call.
- Radix `SelectValue` shows the selected item's content; grouped or two-line rows must still render in the closed trigger as one line (existing `TRIGGER_ONE_LINE`). Checked in step 7.
- Rollback: revert the commit; ids return to raw.
