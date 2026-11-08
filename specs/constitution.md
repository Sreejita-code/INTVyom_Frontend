# Constitution

- **Version:** 1.0.0
- **Ratified:** 2026-11-08
- **Owner:** VoiceKit frontend maintainers

Standing rules every plan must pass. Each principle has a gate question a plan
answers yes or no. Stricter than the coding standards, never looser. Change it
only through `core-fe-constitution`, with the user's approval.

## Principles

| # | Principle | Rule | Gate question |
|---|-----------|------|---------------|
| 1 | Test-first behaviour | Every behavioural acceptance criterion has a failing test before its code exists. | Does every behavioural `AC-n` have a test step that runs before its code step? |
| 2 | Simplicity and reuse | Reuse an existing component, hook, or token before writing one; no wrapper without a named reason. | Does the plan list the reuse inventory and justify each new component? |
| 3 | Every state designed | Loading, empty, error, and partial-data states exist for every data view. | Does the plan cover all four states for every data view? |
| 4 | Accessible by default | Keyboard operable, visible focus, named controls, sufficient contrast. | Does the plan state keyboard behaviour and accessible names? |
| 5 | Responsive and themed | Works at 375, 768, 1024, 1440, 1920 px, in every theme the app has. | Does the plan name the widths and themes to verify? |
| 6 | Tokens, not literals | Colours, spacing, and type come from design tokens, not literals. | Does the plan use existing tokens, and name any new one? |
| 7 | Repo conventions (`AGENTS.md`) | Services follow `call<X>Endpoint` / `condense<X>Response`, authenticated calls use `authedFetch`, bodies are read with `readJson`, imports use `@/`, files are placed per `AGENTS.md`. | Does the plan follow the `AGENTS.md` service, import, naming, and placement rules? |

## Why

- **Test-first behaviour:** the repo has 426 tests and a green baseline; behaviour added without a test is the first thing to regress.
- **Simplicity and reuse:** `AGENTS.md` sets the extraction bar at three routes and bans dead code.
- **Every state designed:** every page here fetches from a backend that can be slow, empty, or return `4xx`/`5xx`.
- **Accessible by default:** the app is a developer console used by keyboard as much as by mouse.
- **Responsive and themed:** `driver.mjs sweep` already checks every route at five widths.
- **Tokens, not literals:** `src/index.css` and the Tailwind config hold the design system; literals drift.
- **Repo conventions:** `AGENTS.md` is the single source of truth; a plan that ignores it creates cleanup work.

## Governance

- A violation is allowed only when the plan records it under Complexity
  tracking, with the reason and the simpler alternative rejected.
- `core-fe-analyze` treats an unrecorded violation as Critical.
- Amendments need the user's approval and a version bump.

## Amendment log

| Date | Version | Change | Reason |
|------|---------|--------|--------|
| 2026-11-08 | 1.0.0 | Ratified | First constitution; starter set plus repo-conventions principle |
