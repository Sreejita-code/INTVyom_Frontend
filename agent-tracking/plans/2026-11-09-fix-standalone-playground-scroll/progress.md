# Progress — standalone playground scrolling and consistency

## Scope

Confirmed 2026-11-09. STT playback was added by the user during research.

## Research

Browser evidence and root causes are recorded in
`agent-tracking/research/2026-11-09-fix-standalone-playground-scroll.md`.

## Approval

Approved by the user on 2026-11-09.

## Implementation

1. Added regression tests for bounded workbench tracks, route-change scroll restoration, and STT
   audio preview URL cleanup. The tests failed before the corresponding fixes and pass afterward.
2. Added `PlaygroundWorkbench` and migrated STT, LLM, and TTS to its mobile-safe single track and
   `xl` request/result split. The shared result surface now becomes sticky at the same breakpoint.
3. Made the dashboard content pane the explicit scroll owner and reset it only when `pathname`
   changes.
4. Added a native audio player for the accepted STT upload or completed recording; object URLs are
   revoked when replaced or unmounted.
5. Updated `README.md` and `AGENTS.md` for the new shared component.

## Verification

- Focused: 5 files, 38 tests passed.
- Full: 72 files, 529 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with the existing large-chunk warning.
- `npm run lint`: unchanged baseline, 82 findings (74 errors, 8 warnings); targeted changed-file
  lint passed.
- `git diff --check`: passed.
- Chromium direct measurements at 375 px: each route reports a 375 px content pane and a 343 px
  workbench/form; no form exceeds its grid. Route navigation resets the pane from 333 to 0.
- Mandatory browser sweep: STT, LLM, and TTS passed at 375, 768, 1024, 1440, and 1920 px (15/15).
  Every after screenshot was visually inspected; output is under
  `agent-tracking/screenshots/2026-11-09-fix-standalone-playground-scroll/after/`.
