# Scope — 2026-10-20-docs-agent-guidance

**Task type:** docs (documentation sync + agent-guidance restructure)
**Date:** 2026-10-20

## The user's request, verbatim

> @core-fe-debug -> update the Claude.md and Agents.md and REadme.. and there should be no uplicate in calude and agents.md .. claude.md should take forom agents.md

Parsed into requirements:

1. Update `AGENTS.md` (the agent rules file) — bring it in line with the code as it is now.
2. Create `CLAUDE.md` — Claude Code reads it; it must **not duplicate** `AGENTS.md`.
3. `CLAUDE.md` must **take from** `AGENTS.md` — i.e. import it (`@AGENTS.md`), so there is one
   source of truth.
4. Update `README.md` so it matches the code.

## Facts established by reading the repo (2026-10-20)

- `CLAUDE.md` does **not** exist today. `AGENTS.md` (123 lines) and `README.md` (497 lines) do.
- `.claude/skills/` already exists as directory symlinks into `.agents/skills/` — the repo-local
  pack (`plan-before-implement`, `react-service-structure`, `ui-design-system`,
  `run-intvoicekit-frontend`). `.agents/` is the single source of truth for those.
- The `core-fe-*` pack is installed globally (`~/.agents/skills/core-fe-*`) and is *not* referenced
  from the repo's `AGENTS.md` today.
- The code has moved on since the `AGENTS.md` baseline was refreshed (2026-09-22). The docs are
  stale in these ways (see `research/2026-10-20-docs-agent-guidance.md`):
  - route `/dashboard/developer` exists and `/dashboard/api-keys` now redirects to it;
  - `src/services/meetingCall/`, `src/lib/{apiSnippet,assistantModes,callMetadata,formatUrl,readJson,toastError,webhookSamples,placeholders}.ts`,
    `src/hooks/{useCopyToClipboard,usePersistedFlag}.ts`,
    `src/components/common/{ApiSnippet,CopyIdButton,JsonSample,MetadataEditor}.tsx` are missing from
    the README tree;
  - `src/routes/dashboard/assistant/` has grown `LlmSection/SttSection/TtsSection/AudioChain/
    FieldRow/GettingStarted/TemplatePicker/BillableMinutesLookup` — `AGENTS.md` still describes the
    old three-file split;
  - `src/components/ui/` holds **27** primitives, the README says 24;
  - `npm run build:dev` exists but is not in the README scripts table.
- Baseline re-measured today: `typecheck` clean, `lint` 82 problems (74 errors, 8 warnings),
  `test` 44 files / 314 tests passing. `AGENTS.md`'s numbers still hold.

## Open questions put to the user

Recorded in `plan.md` (asked before implementing):

1. Should `AGENTS.md` carry the managed `core-fe` block (the pack's registration markers), given
   the repo already has its own local pack? — Two packs that overlap would be the duplication the
   request wants removed.
2. Product naming in the docs: the code says `VoiceKit` in most user-facing copy but `INTVOICEKIT`
   remains in the sidebar, the storage keys, and the package name.
