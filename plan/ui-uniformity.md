# UI Uniformity + Code Quality — Tracking Plan (v2)

**Why v2:** v1 (`plan/ui-rebrand.md`, gate 8.33 PASSED) fixed copy/search/backgrounds but never
checked interactive affordances, radius/motion uniformity, or code duplication. This plan covers that.
**Bar: average ≥ 9.0 AND no reviewer below 8, max 3 rounds.** All work uncommitted unless stated.

## Audit findings (master agent, 2026-09-19 — all confirmed in code)

1. **Logo is dead.** Desktop + mobile `INTVOICEKIT` wordmarks are plain `<h1>` —
   clicking does nothing (`DashboardLayout.tsx` ~166, ~188).
2. **User row is dead.** Sidebar footer shows avatar+name+logout icon; clicking the row does
   nothing, and user details (User ID) are visible nowhere in the shell.
3. **Two panel radii.** `glass rounded-2xl` (Phone/Inbound/Inbound Rules/MakeCall detail panes,
   AssistantForm sections) vs `glass rounded-xl` (Tools/CallLogs/Analytics, 41 uses, dominant).
   Icon tiles `rounded-2xl` vs EmptyState icon `rounded-3xl` vs modal cards `rounded-3xl`.
4. **Entrance animation only on 3 of 6 master-detail pages.** Phone/Inbound/Inbound Rules detail
   roots have `animate-in fade-in slide-in-from-right-4 duration-500`; Assistant/Tools/Audio
   detail roots have nothing. No page replays on selection change (no `key`).
5. **Copy-ID pattern pasted 4×.** Identical Copy/Check + `navigator.clipboard` + toast logic in
   `assistant/Assistant.tsx`, `tools/Tools.tsx`, `audio-library/AudioLibrary.tsx`,
   `inbound-context/InboundContext.tsx` — meets the 3+ routes extraction bar, still unextracted.
6. **Collapsibles rare.** Only MakeCall passthrough tab + StageSection use Accordion; agent-tab
   Variables render inline while passthrough hides them behind `Advanced · call tags`.
7. No `console.log`/TODO junk found in routes (verify again at the end).

## Round 1 — Fixes (master agent)

**Affordances**
- [ ] Logo (desktop + mobile) navigates to `/dashboard/assistant` (landing page), `aria-label="Go to home"`.
- [ ] User footer becomes a `Popover`: trigger = user row; content = name, User ID row with copy
  button, Log out button (logout moves inside; drop the lone icon button to avoid two logouts).

**Uniformity standard (documented here, applied everywhere)**
- Panels/cards/surfaces: `rounded-xl`. Icon tiles: `rounded-lg`. Floating overlays (dialogs,
  chat modal): `rounded-2xl`. Chat bubbles: keep `rounded-2xl` (message pattern). Pills/avatars:
  `rounded-full`. Controls: shadcn defaults.
- [ ] `rounded-2xl` → `rounded-xl` everywhere EXCEPT `CallLogs.tsx:561` (chat bubble).
- [ ] `rounded-3xl` → `rounded-2xl` everywhere EXCEPT `EmptyState.tsx:36` → `rounded-xl`.
- [ ] Detail entrance: add `animate-in fade-in slide-in-from-right-4 duration-500` to Assistant /
  Tools / Audio detail roots (the 3 missing it) + `key={selected…}` on all 6 detail contents so
  the animation replays on every selection, like the Phone page users praised.
- [ ] Agent-tab Variables wrapped in `Accordion` (`Advanced · call variables`), mirroring passthrough.

**Code quality**
- [ ] New `src/components/common/CopyIdButton.tsx` (`{ value, label }`, Copy/Check + toast inside);
  refactor the 4 pages to use it. No behavior change: same clipboard write, same toast style.
- [ ] Spacing/symmetry pass on touched areas only (no drive-by redesigns).
- [ ] Verify: `typecheck`, full `test`, `lint` (must not exceed baseline 89), driver `route` on all
  touched routes, read 375 + 1920 screenshots.

## Round 2 — Judging (4 reviewers, independent subagents, same screenshots)

Pages shot at 375 + 1920: `assistant`, `phone-number` (the praised reference), `make-call`,
`developer`, `tools`.
1. **First-time-user lens** — logo/user affordances, ≤2 clicks, jargon, collapsible discoverability.
2. **Craft lens** — corner uniformity, padding symmetry inside boxes/clickables, header/box rhythm,
   eye-flow (no jagged edges).
3. **Motion lens** — entrance animation uniform + replays on selection on all 6 pages; transitions
   150–250ms; nothing loops except live indicators.
4. **Code lens** — no pasted logic (extraction bar honored), no dead code/unused exports, files in
   the right layer per `react-service-structure`, explicit prop/return types, no new `any`.
- Each reports **score/10 + top 3 issues with file paths**. Gate: **avg ≥ 9.0 AND min ≥ 8**,
  else fix cited issues and re-run (max 3 rounds). Log below.

## Review log

| Round | Reviewer | Score | Top issues | Date |
|-------|----------|-------|------------|------|
| 1 | first-time-user | 7 | trunk-modal jargon wall; Phone line vs Phone Number confusion + `</>`; tiny accordion triggers | 2026-09-19 |
| 1 | craft | 7 | integration header bare + divider rules; modal rhythm (double-edge row, mixed labels); guide CTA stagger | 2026-09-19 |
| 1 | motion | 7 | list entrances differ; nested axes in phone modal; broad `transition-all` | 2026-09-19 |
| 1 | code | 6 | **(real bug)** palette prefill bound to wrong cmdk prop; fire-and-forget clipboard; SecretRow un-migrated | 2026-09-19 |
| 2 | (fixes) | — | cmdk prefill moved to CommandInput; `useCopyToClipboard` hook + CopyIdButton hardened; SecretRow migrated; icon-tile headers; dividers removed; motion bands unified; modal + MakeCall plain language; per-tab helpers; readable accordion triggers | 2026-09-19 |
| 3 final | first-time-user | 9 | empty-list text has no inline create button; disabled Start call gives no reason; `</>` icon-only button unexplained | 2026-09-19 |
| 3 final | craft | 9 | raster-vs-letter logo weight (needs real assets); "Line nickname" label lacks leading icon | 2026-09-19 |
| 3 final | motion | 9 | 2 hover transitions missing duration-200; 500ms replay slow for rapid switching | 2026-09-19 |
| 3 final | code | 9 | **(real bug)** tooltip `title={value}` leaked masked secrets on hover → fixed to `title={displayValue ?? value}`; verified typecheck/test/driver | 2026-09-19 |

**Gate: average ≥ 9.0 AND no reviewer below 8.** Final: avg **9.0**, min 9 → **PASSED**.
Residuals are micro-nits (inline create button, disabled-button reason, logo assets, 2 missing
durations) parked as future work. Work remains uncommitted per user instruction.

## Post-gate fix (2026-09-19)

- Meet tab matched to the other two Make-a-Call tabs: Variables collapsed behind the same
  `Advanced · call variables` accordion, same plain-word blurbs, `Agent` → `Assistant` strings,
  same stacked mobile button row, meet-link helper. (`MeetingCallTab.tsx`)
- Verified: typecheck clean, 194 tests pass, driver 0 failures ×5 widths on `/dashboard/make-call`.
