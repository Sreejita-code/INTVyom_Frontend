# Report — Agent guidance and README sync

**Slug:** `2026-10-20-docs-agent-guidance` · **Date:** 2026-10-20 · **Type:** docs

## Summary

Three documents now say one thing, and the code says what they say.

- `CLAUDE.md` **created** — one line, `@AGENTS.md`. It imports the rules instead of copying them,
  so the two files cannot drift apart.
- `AGENTS.md` **rewritten** — still the single source of truth, now accurate about the repo:
  one skill pack, a written workflow, the current folder layout, the routing rule, and a
  baseline re-measured today.
- `README.md` **refreshed** — brand, routes, pages, project tree, scripts, primitives count,
  and a new *Agent workflow* section.

Nothing under `src/`, `tests/`, or any config was touched.

## Scope and method

The request: *"update the Claude.md and Agents.md and README, and there should be no duplicate in
Claude and Agents.md — CLAUDE.md should take from Agents.md."*

Method: read every existing doc and the code they describe, re-measured the baseline, wrote the
gaps down, asked three scoping questions, then wrote the three files and checked every path they
name against the filesystem.

Three decisions came from the user:

| Question | Answer |
|---|---|
| Which skill pack does `AGENTS.md` name? | **The repo-local one only** (`.agents/skills/`) — the `core-fe-*` pack overlaps it, so its managed block was not inserted |
| Which product name do the docs use? | **VoiceKit**, with the surviving legacy identifiers called out |
| How deep is the README tree? | **Same depth as today, corrected** |

## Current → Target

| Document | Before | After |
|---|---|---|
| `CLAUDE.md` | did not exist | one line: `@AGENTS.md` |
| `AGENTS.md` | 123 lines; described the assistant page as five files; listed 4 of 16 services; no workflow section; no mention of `CLAUDE.md` or `agent-tracking/`; named the pack without saying it was the only one | 180 lines; describes the assistant page as it is (20 files, stage sections, `FieldRow`, `AudioChain`); lists all 16 services, 10 lib helpers, 3 hooks, 6 common components, 27 primitives; adds `## Workflow` + the `agent-tracking/` convention; states that `CLAUDE.md` imports it and must never copy from it |
| `README.md` | 497 lines; no `/dashboard/developer`; "24 primitives"; missing `build:dev`; tree missing ~40 real files; pages named "API Keys" / "Integration"; title "INTVOICEKIT Frontend" | 560 lines; `/dashboard/developer` documented and `/dashboard/api-keys` documented as a redirect; 27 primitives; `build:dev` + `test:watch` in the scripts table; tree matches `find src` exactly; page names match `navItems.ts`; title "VoiceKit Frontend" with a naming note |

## Changes

**`CLAUDE.md`** (new, 1 line)

```
@AGENTS.md
```

**`AGENTS.md`**

- New paragraph at the top: this file is the single source of truth; `CLAUDE.md` imports it and
  must not copy from it.
- `## Project` — the product is VoiceKit; the three identifiers that still say `INTVOICEKIT`
  (npm package, Docker container, `intvoicekit_*` localStorage keys) are named and marked
  unsafe to rename.
- New `## Workflow` — read → baseline → propose → **ask and wait** → implement one step at a
  time → verify → sync the docs → report, plus the `agent-tracking/` folder layout and the slug
  convention. This is the discipline the `core-fe` block would have carried, written in the
  repo's own voice instead of imported.
- `## Commands` — added `build:dev`, `test:watch`, and the browser sweep.
- `## Repository structure` — the shell files (`DashboardSidebar.tsx`, `CommandPalette.tsx`,
  `navItems.ts`), all 16 service modules, the 10 `lib` helpers, the 3 hooks, the 6 common
  components, 27 primitives, `agent-tracking/`, and the assistant page as it is actually split.
- `## Conventions` — new rule: a moved route keeps its old path as a `<Navigate>`, not a 404.
- `## Baseline` — re-measured 2026-10-20; the numbers were still correct, so only the date
  and one dangling path reference changed.

**`README.md`**

- Title and a naming note (VoiceKit; the legacy identifiers and why they stay).
- Route block: `/dashboard/developer` added, `/dashboard/api-keys` marked as a redirect, plus a
  note that a renamed page keeps its old path.
- `DashboardLayout` list now includes the command palette and `navItems.ts` as the nav source.
- Project tree: every file in `src/` and `tests/` listed; `CLAUDE.md`, `agent-tracking/`,
  `package-lock.json` (and `bun.lockb` marked stale) added; `plan/` removed (see below).
- Features table renamed to match the sidebar (Assistants, Phone Numbers, Inbound Rules,
  Passthrough Calls, Your VoiceKit API key, Provider Keys) + a new **Developer page** section.
- 27 primitives, six shared components.
- Scripts table: `build:dev` and `test:watch`.
- Assistant editor: the file table now includes the three stage sections, `FieldRow.tsx`,
  `TemplatePicker.tsx`, `GettingStarted.tsx`.
- New **Agent workflow** section: what `AGENTS.md` is, why `CLAUDE.md` is one line, the
  `agent-tracking/` layout, and the skill symlink rule.

## Verification

| Command | Before | After |
|---|---|---|
| `npm run typecheck` | clean | clean |
| `npm run lint` | 82 problems (74 errors, 8 warnings) | 82 problems (74 errors, 8 warnings) — unchanged |
| `npm run test` | 44 files, 314 tests, all pass | 44 files, 314 tests, all pass — unchanged |

Document checks:

| Check | Result |
|---|---|
| `CLAUDE.md` content | exactly one line, `@AGENTS.md` — zero rule text, zero duplication |
| Every repo path named in `README.md` / `AGENTS.md` | exists on disk |
| Paths that do **not** exist, and why | `src/assistant/assistant.rules.js` (a **backend** file the README points at), `src/features/`, `src/stores/`, `src/styles/` (layers that deliberately do not exist yet) |
| `README.md` scripts vs `package.json` | 8 of 8 scripts documented, in the same order |
| `README.md` env table vs `.env.example` | 3 of 3 variables match |
| README tree vs `find src` | every file listed, no file missing |
| Page names vs `src/routes/dashboard/navItems.ts` | 12 of 12 match |

## Screenshots

None — a documentation change has no visual surface. The browser sweep was not run because no
route, component, or style was touched; the baseline in `AGENTS.md` still records its last
result (0 failing checks across 15 routes × 5 widths).

## Docs updated

| File | Change |
|---|---|
| `AGENTS.md` | single source of truth: brand, workflow, commands, structure, conventions, baseline |
| `CLAUDE.md` | created — imports `AGENTS.md` |
| `README.md` | brand, routes, pages, tree, scripts, primitives, agent workflow, developer page |
| `agent-tracking/INDEX.md` | this task's row, status → `done` |

## Out-of-scope observations

1. **`plan/` was deleted from the working tree during this session — not by this task.** The four
   tracked files (`api-contract-alignment.md`, `backend-requests.md`, `ui-rebrand.md`,
   `ui-uniformity.md`) are gone from disk but present in git at `f334abc`; `git checkout -- plan/`
   restores them. This task removed the docs' references to them rather than resurrecting the
   files — restoring them is your call.
2. **The sidebar still says "INTVOICEKIT"** (`DashboardSidebar.tsx`: "Signed in to INTVOICEKIT"
   and the home `aria-label`) while the rest of the UI says VoiceKit. That is a code copy fix,
   not a doc fix.
3. **`MetadataEditor.tsx` is used by two routes in three files**, and `usePersistedFlag.ts` by two
   components rather than two routes — both sit just under the "3 or more" bar `AGENTS.md` states.
   The wording now says "routes or shells" and "3 or more call sites".
4. **`src/services/assistant/assistantBuilderService.test.ts`** tests `assistantService.ts`; the
   file name no longer matches the module it covers.

## Trace

- Request: `agent-tracking/plans/2026-10-20-docs-agent-guidance/scope.md`
- Research and gaps: `agent-tracking/research/2026-10-20-docs-agent-guidance.md`
- Plan: `agent-tracking/plans/2026-10-20-docs-agent-guidance/plan.md`
- Step log: `agent-tracking/plans/2026-10-20-docs-agent-guidance/progress.md`
