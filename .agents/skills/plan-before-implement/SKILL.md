---
name: plan-before-implement
description: >
  The working loop for any change in this repo: read the existing code and
  docs, record a baseline, propose the smallest change, get the user's
  agreement, then implement one step at a time with verification between
  steps. Use before writing code for a feature, refactor, restructure, or
  redesign — anything larger than a typo. Triggers on "add", "build",
  "refactor", "restructure", "clean up", "improve", "redesign".
---

# Plan Before Implement

Paths below are relative to the repo root.

The order is fixed: **read → baseline → audit → propose → ask → implement →
verify**. The step that gets skipped is "ask", and skipping it is how a small
request turns into an unwanted rewrite.

## 1. Read

- `README.md` and `AGENTS.md` first. `AGENTS.md` wins over any skill.
- The directory you are about to touch, in full — every file, not the one you
  were pointed at.
- `react-service-structure` for where a new file belongs, `ui-design-system`
  for anything visual, `run-intvyom-frontend` for how to see the app.

Never change code you have not read.

## 2. Baseline

Record the numbers before touching anything. "No regressions" without a
before-number is a guess.

```bash
npm run test        # vitest
npm run typecheck   # tsc -b
npm run lint        # eslint, known pre-existing failures
npm run build       # tsc -b && vite build
```

`AGENTS.md` carries the expected results. If yours differ, that is a finding —
report it, do not silently adopt it as the new baseline.

## 3. Audit

List what is actually wrong, each with its path. Separate what the request
needs from what you merely noticed. Nothing in the second list gets done
without being asked for.

## 4. Propose the smallest change

- Prefer reusing what exists over adding: an existing service function, an
  existing `src/components/common/` shell, an existing utility in
  `src/index.css`.
- No new abstraction for one caller. No new dependency for what a few lines do.
- No speculative layers — `src/features/`, `src/stores/`, and `src/styles/` are
  absent on purpose.
- Deleting is a valid change. Say what the change does **not** cover.

## 5. Ask, then wait

Present the plan — what changes, which files, in what order, what could break —
and **stop for the user's answer.** Offer the ideas you have, including the
ones you are not going to do. For anything ambiguous, ask rather than assume:
a wrong assumption costs more than a question.

Exception: a genuinely trivial, reversible fix (a typo, a one-line correction)
does not need a round trip.

## 6. Implement one step at a time

- One concern per step, each leaving the repo working.
- Use `git mv` for moves so history survives.
- Behaviour must not change during a refactor: same requests, same error
  handling, same rendered output.
- Verify between steps, not only at the end. A broken middle state that gets
  interrupted is worse than a slow finish.

## 7. Verify and document

- Re-run the four baseline commands. Results must be no worse than step 2.
- For UI work, run the driver over every route you touched and look at the
  screenshots — see `run-intvyom-frontend`.
- Update `README.md` (structure tree, routes, env vars) and `AGENTS.md`
  (conventions, baseline) in the same change. A structure change is not done
  until the docs match it.
- Report honestly: what was done, what was skipped, what is still broken.
