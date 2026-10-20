# Plan — 2026-10-20-docs-agent-guidance

**Status:** approved (2026-10-20, by the user — answers to the three scope questions)

## Goal

Make `AGENTS.md` the single source of agent rules for this repo, have `CLAUDE.md` import it
instead of repeating it, and bring `README.md` back in line with the code.

## Success criteria

- `CLAUDE.md` contains the import line `@AGENTS.md` and **no** rule text of its own — no
  duplication between the two files.
- `AGENTS.md` names exactly one skill pack (the repo-local `.agents/skills/`), describes the
  current `src/` layout, and states that it overrides every skill.
- Every route, service, hook, lib helper and common component that exists in `src/` today is
  represented in `README.md`; the "24 primitives" figure and the missing script are fixed.
- The docs call the product **VoiceKit** and name the surviving legacy identifiers
  (`intvoicekit_*` storage keys, npm package name, docker container name).
- `npm run typecheck`, `npm run lint`, `npm run test` are unchanged and still green (no source
  file is touched).

## Skills applied

- `core-fe-workflow` (tracking, scope, plan, docs sync, report)
- `plan-before-implement` (the repo's own loop: read → baseline → propose → ask → implement →
  verify — the "ask" step is this plan)

## Steps

- [x] 1. Read the current `AGENTS.md`, `README.md`, `package.json`, `src/App.tsx`,
      `src/routes/dashboard/navItems.ts`, and the real `src/` + `tests/` trees.
- [x] 2. Re-measure the baseline (`typecheck`, `lint`, `test`).
- [x] 3. Record the gaps in `research/2026-10-20-docs-agent-guidance.md`.
- [x] 4. Ask the user the three scope questions (pack registration, product name, tree depth).
- [x] 5. Rewrite `AGENTS.md`: one pack, refreshed structure, workflow section, `CLAUDE.md` rule,
      tracking convention, refreshed baseline.
- [x] 6. Create `CLAUDE.md` with the single line `@AGENTS.md`.
- [x] 7. Refresh `README.md`: brand, routes, features table, project tree, scripts, primitives
      count, legacy-name note, `agent-tracking/` entry.
- [x] 8. Verify: no rule text is duplicated between `AGENTS.md` and `CLAUDE.md`; every path the
      docs name exists; `typecheck` / `lint` / `test` unchanged.
- [x] 9. Report in `agent-tracking/reports/2026-10-20-docs-agent-guidance.md`.

## Files expected to change

| Path | Change |
|------|--------|
| `AGENTS.md` | rewritten: single pack, current structure, workflow + tracking rules, refreshed baseline |
| `CLAUDE.md` | **new** — the single line `@AGENTS.md` |
| `README.md` | brand, routes, features table, project tree, scripts, primitives count, legacy names, `agent-tracking/` |
| `agent-tracking/INDEX.md` | status → `done` |
| `agent-tracking/plans/2026-10-20-docs-agent-guidance/progress.md` | step log |
| `agent-tracking/reports/2026-10-20-docs-agent-guidance.md` | the report |

No file under `src/`, `tests/`, or any config is touched.

## Design notes

N/A — documentation task, no UI.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Dropping the `core-fe` block loses the pack's workflow discipline | the same discipline is written into `AGENTS.md`'s new **Workflow** section, and the repo-local `plan-before-implement` skill already enforces it; `AGENTS.md` overrides every skill anyway |
| Rewriting `AGENTS.md` breaks an agent that relies on a removed line | every removed line was stale or duplicated; the removed content is preserved in git history and in the research note |
| README drifts again after the next feature | the **Docs sync** rule in `AGENTS.md` and the README's own "keep this table in sync" note; the baseline section is dated so a stale line is visible |

## Delivery and rollback

- **Blast radius:** AI agents reading the repo rules, and developers reading the README. No runtime
  behaviour changes.
- **Rollout:** plain — three files, no flags.
- **Rollback recipe:** `git checkout -- AGENTS.md README.md && rm CLAUDE.md`.

## Verification

| Command | Expected |
|---------|----------|
| `npm run typecheck` | clean |
| `npm run lint` | unchanged — 82 problems (74 errors, 8 warnings) |
| `npm run test` | unchanged — 44 files, 314 tests, all pass |
| `grep -c` rule lines in `CLAUDE.md` | the file is one line: `@AGENTS.md` |
| every path named in the docs | exists on disk |

## Plan changes after first draft

- The user chose the **repo-local pack only** option, so the managed `core-fe` block is *not*
  inserted into `AGENTS.md`. The workflow discipline it carried is written out in the repo's own
  voice instead.
