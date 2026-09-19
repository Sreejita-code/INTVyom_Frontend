# UI Rebrand + Navigation Fix — Tracking Plan

**Goal:** Top-level dark-neon UI. Fix the duplicate sidebar search, remove the dead-end Help link,
rebrand while KEEPING the dark neon theme (tokens in `src/index.css` stay), strip watermarks so
every background is proper and standard.

**Source of truth:** this file (`plan/ui-rebrand.md`). The old plan at
`~/.opencode/plan/intvyom-usability-redesign.md` is superseded for UI work.

## Round 1 — Fix what's wrong (master agent) — DONE

- [x] Audited: duplicate search confirmed (`DashboardLayout.tsx` has ⌘K button + filter input
  stacked), Help link confirmed (always routes to `/dashboard/developer`), watermarks confirmed
  (`.watermark` giant text on every page, `VYOM` giant text on Assistant, 0.03 radial glows on
  Inbound / Inbound Rules / Phone Numbers).
- [x] Sidebar: ONE search box. It filters the nav list inline; `⌘K` hint lives inside it;
  `Enter` (or `⌘K`/`Ctrl+K` anywhere) opens the command palette pre-filled with the query.
  Separate palette button deleted.
- [x] Deleted the `Help · IDs and keys guide` nav footer link (dead end — the IDs guide already
  lives on the Your API Keys page in Developers).
- [x] `CommandPalette.tsx`: controlled `query`/`onQueryChange` (rebuilt on `Dialog` + `Command`
  directly — the vendored `CommandDialog` doesn't expose the search value; `command.tsx` untouched).
- [x] Rebrand (dark neon kept, no token changes):
  - [x] Removed `.watermark` giant text from `DashboardLayout` + deleted `.watermark` from `index.css`.
  - [x] Removed `VYOM` giant text from `Assistant.tsx` detail pane.
  - [x] Removed 0.03 radial-glow overlays from `Inbound.tsx`, `InboundContext.tsx`, `PhoneNumber.tsx`.
  - [x] Standardized page headers (icon + `text-2xl font-bold` + `text-sm` helper):
    `Tools.tsx` (`text-xl` → `text-2xl`), `Integrations.tsx` (gradient `text-3xl/4xl` → standard).
- [x] Round-2 iteration (avg 6.3): plain-language MakeCall labels (`Phone line`, `Assistant Call`,
  `Choose Assistant`), plainer nav helpers, wrapped sidebar helpers (`line-clamp-2`), mobile
  tab wrap + stacked call row, Assistants header helper, mobile onboarding slot, enclosed
  Developer sections, unified provider-logo fallback size.
- [x] Round-3 iteration (avg 7.67): `Agent` → `Assistant` in all MakeCall UI strings, plain-word
  metadata blurbs, proper provider display names (`ElevenLabs`/`OpenAI`, no CSS `capitalize`),
  `EmptyState` `compact` variant, mobile-stacked guide CTAs, guide moved below list on mobile.
- [x] Verify: `npm run typecheck` clean; `npm run test` 193 pass; driver `route` 0 failures ×5
  widths on `assistant`, `tools`, `make-call`, `developer`, `integration`; 375 + 1920 screenshots
  visually reviewed each round.

## Round 2 — Multi-agent design review (the judging loop)

Reviewers are spawned as subagents AFTER Round 1 verifies. Each reviewer gets the same
screenshots + rubric and works independently.

- [ ] Master captures fresh screenshots: `assistant`, `tools`, `make-call`, `developer`
  at 375 and 1920 (8 PNGs in `.artifacts/screens/`).
- [ ] Spawn 3 reviewer subagents (different lenses so scores don't correlate):
  1. **First-time-user lens** — can a non-technical user find Make a Call, IDs/keys, call logs
     in ≤2 clicks? Is any word jargon?
  2. **Visual-design lens** — spacing grid, type scale, alignment, consistency across the 4 pages,
     dark-neon restraint (no watermark/gimmick leftovers).
  3. **Accessibility/responsive lens** — 375 vs 1920, touch targets, labels, focus order, contrast.
- [ ] Rubric (each reviewer scores 1–10, must cite screenshot evidence per deduction):
  - Findability & navigation (30%) — ≤2 clicks, one search, no dead ends.
  - Visual quality & consistency (30%) — standard headers/backgrounds, no leftover gimmicks.
  - Plain language (20%) — no unexplained jargon, every ID/key says what/where.
  - Responsive + a11y (20%) — 375 clean, labels/focus intact.
- [ ] Each reviewer reports back to master: **score/10 + top 3 issues with file paths**.
- [ ] Gate: **average > 8 AND no reviewer below 7** → done. Otherwise master fixes the cited
  issues (one concern per edit, re-verify) and re-runs the loop, max 3 rounds.
- [ ] Scores and round notes are appended below in §Review log (auditable history).

## Review log

| Round | Reviewer | Score | Top issues | Date |
|-------|----------|-------|------------|------|
| 1 | first-time-user | 5 | MakeCall trunk/passthrough/metadata jargon; sidebar nav jargon; Developers below fold + double search (partly disputed — page searches are page-scoped, ⌘K covers) | 2026-09-19 |
| 1 | visual-design | 7 | header pattern not standard; provider logo weight mismatch; Developer vs Integration section styles diverge | 2026-09-19 |
| 1 | responsive-a11y | 7 | make-call tabs clipped at 375; onboarding missing on mobile; cramped phone row at 375 | 2026-09-19 |
| 2 | first-time-user | 7 | Variables/metadata jargon remains; Agent vs Assistant naming split; sidebar helpers truncated | 2026-09-19 |
| 2 | visual-design | 8 | raster-vs-letter tile weight (data-dependent, kept); `capitalize` mangling brand names; empty-state rhythm Assistant vs Tools | 2026-09-19 |
| 2 | responsive-a11y | 8 | guide rows squeeze CTA on mobile; guide pushes list below fold on mobile; (3rd: none — tabs/row fixed) | 2026-09-19 |
| 3 | first-time-user | 8 | empty-list text has no adjacent create button; step 1 CTA self-links; `{{name}}`/raw-JSON still technical | 2026-09-19 |
| 3 | visual-design | 8 | raster-vs-letter tiles (assets missing — needs real logos, not code); list search icon differs Assistant vs Tools; compact vs default empty-state scale | 2026-09-19 |
| 3 | responsive-a11y | 9 | secret values truncate instead of wrap; tablist wraps 2+1; mobile dead whitespace above guide | 2026-09-19 |

**Gate: average > 8 AND no reviewer below 7.** Round 3: avg **8.33**, min 8 → **PASSED**.
Round-3 residuals are diminishing returns (need real logo assets, deeper MetadataEditor rework)
and are parked as future work, not a 4th round. Work remains uncommitted per user instruction.
