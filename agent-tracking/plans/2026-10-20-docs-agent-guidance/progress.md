# Progress — 2026-10-20-docs-agent-guidance

## 2026-10-20 — steps

| # | Step | Result |
|---|------|--------|
| 1 | Read `AGENTS.md`, `README.md`, `package.json`, `vite.config.ts`, `src/App.tsx`, `navItems.ts`, the real `src/` and `tests/` trees | done — gaps listed in `research/2026-10-20-docs-agent-guidance.md` |
| 2 | Re-measured the baseline: `typecheck` clean, `lint` 82 problems (74 errors, 8 warnings), `test` 44 files / 314 tests passing | done |
| 3 | Wrote `research/2026-10-20-docs-agent-guidance.md` | done |
| 4 | Asked the user three scope questions (pack registration, product name, tree depth) | done — answers: repo-local pack only · VoiceKit with legacy names called out · same tree depth, corrected |
| 5 | Rewrote `AGENTS.md` | done — one pack, `## Workflow` section, `agent-tracking/` convention, refreshed structure, refreshed baseline, `CLAUDE.md` single-source rule |
| 6 | Created `CLAUDE.md` | done — one line: `@AGENTS.md` |
| 7 | Refreshed `README.md` | done — brand + legacy names, routes (developer + api-keys redirect), features table, developer page section, project tree, 27 primitives, scripts (`build:dev`, `test:watch`), agent-workflow section, assistant-editor file table |
| 8 | Verified | done — every repo path named in the docs exists (only the backend's `src/assistant/assistant.rules.js` and the deliberately absent `src/features|stores|styles` do not); `typecheck` / `lint` / `test` unchanged |
| 9 | Report | done — `agent-tracking/reports/2026-10-20-docs-agent-guidance.md` |

## Decisions

- **One pack.** The repo-local `.agents/skills/` pack stays the only pack named in `AGENTS.md`.
  The globally installed `core-fe-*` pack overlaps it (workflow, debug, verify, design,
  structure), so inserting its managed block would have recreated the duplication the request
  wants removed. Its discipline — read → baseline → propose → ask → implement → verify → sync
  docs → report — is written out in `AGENTS.md`'s new `## Workflow` section instead, in the
  repo's own voice.
- **`CLAUDE.md` holds one line.** `@AGENTS.md` and nothing else. No rule, table, or file listing
  is copied into it, so the two files cannot drift.
- **VoiceKit, legacy names called out.** The docs use the product name from the UI and name the
  three identifiers that still say `INTVOICEKIT` (npm package, Docker container, `intvoicekit_*`
  localStorage keys), because renaming those signs people out.
- **Docs-only change.** No file under `src/`, `tests/`, or any config was touched.

## Out-of-scope observations

- **`plan/` was deleted from the working tree during this session — not by this task.** The four
  tracked files (`api-contract-alignment.md`, `backend-requests.md`, `ui-rebrand.md`,
  `ui-uniformity.md`) are gone from disk but still in git (`f334abc`). They are recoverable with
  `git checkout -- plan/`. This task removed the docs' references to them rather than
  resurrecting the files; restoring them is the user's call.
- **`src/components/common/MetadataEditor.tsx` is used by two routes** (assistant,
  make-call) in three files, which is below the "3 or more routes" bar `AGENTS.md` states for
  that folder. The rule is really "3 or more call sites"; the wording could be tightened.
- **`src/hooks/usePersistedFlag.ts` is used by two components**, not two routes
  (`MasterDetailShell`, `DashboardLayout`). `AGENTS.md` now says "routes or shells" to match.
- **The sidebar still says "INTVOICEKIT"** (`DashboardSidebar.tsx`: "Signed in to INTVOICEKIT",
  the home `aria-label`), while the rest of the UI says VoiceKit. A copy fix in the code, not in
  the docs — flagged, not changed.
