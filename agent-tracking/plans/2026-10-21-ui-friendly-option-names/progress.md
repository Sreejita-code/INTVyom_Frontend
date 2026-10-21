# Progress — 2026-10-21-ui-friendly-option-names

- Baseline: 49 files / 416 tests, typecheck clean, lint 82, sweep 0.
- `src/lib/optionNames.ts`: `friendlySpeaker` (language map of 11, style map of 50, title-case fallback) and `friendlyLanguage` (`Intl.DisplayNames`, falls back to the code).
- `providerCatalog.ts`: `languageOptions` and `speakerOptions` replace `asOptions` / `asNamedOptions` (deleted). `FieldOption.group` added. Value is untouched; the raw id is the hint.
- `ConfigField.tsx`: consecutive options with one `group` render under a `SelectGroup` heading ("Hindi · 116").
- Tests: `tests/lib/optionNames.test.ts`, `tests/routes/dashboard/assistant/ConfigField.speakers.test.tsx` (raw ids stay the values for both rosters; closed select shows the name).
- After: 51 files / 426 tests, typecheck clean, lint 82, build ok, sweep 0 failing checks. Browser at 375 and 1440: list opens, no horizontal overflow, picking "Shreya · Hindi · News" shows it in the trigger.
- Docs: `AGENTS.md` baseline and `src/lib` listing. README unchanged.

## Critique (core-fe-design-ui, Step 5)

- Weak: the closed trigger wraps to two lines at 1440 ("Shubh · Hindi · Customer / support") because the control column is 17rem. Truncating would hide the use, so it wraps.
- Weak: the open list centres on the selected row, so the language heading is scrolled out of view in a long group.
- Ideas: (1) search box for the 224 list, direction C, medium effort; (2) sticky group headings, small; (3) a play-sample button per speaker if upstream ever exposes preview audio.

## Out-of-scope observations

- Speaker order is now by language then name, not the upstream roster order.
- Not verified: language names for rare Indic codes (`brx`, `doi`, `mni`, `sat`) depend on the browser's ICU data; an unknown one shows the code.
