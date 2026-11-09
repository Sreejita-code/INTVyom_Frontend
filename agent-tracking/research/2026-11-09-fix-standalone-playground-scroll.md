# Research — standalone playground scrolling and consistency

## Classification and method

Layout/responsive and scroll-restoration bugs. The audit covered Try it, Code, and Reference for
STT, LLM, and TTS in Chromium at 375, 768, 1024, 1440, and 1920 px. Before screenshots are under
`agent-tracking/screenshots/2026-11-09-fix-standalone-playground-scroll/before/`.

## Baseline

| Check | Result |
|---|---|
| `npm run test` | 71 files, 526 tests passed |
| `npm run typecheck` | passed |
| `npm run lint` | documented baseline: 82 findings (74 errors, 8 warnings) |
| `npm run build` | passed; existing >500 kB chunk warning |
| route driver | all three routes passed its five-width console/document-overflow checks |

The route driver did not catch clipped descendants because the fixed dashboard viewport hides
document overflow. Direct bounding-box measurement exposed the defect.

## Reproduction evidence

1. **Mobile Try-it clipping.** At 375 px, each workbench grid is 343 px wide but each form's
   min-content width is 401.25 px. The main pane has `scrollWidth=417` and `clientWidth=375`.
   STT had 39, LLM 45, and TTS 56 descendants extending past the viewport. Screenshots visibly
   cut the right edges of fields and counters.
2. **Split activates too early.** At 1024 px the 256 px sidebar leaves 768 px for main content.
   The `lg:` request/result split still activates, leaving a narrow form column; provider values,
   language placeholders, and optional-setting summaries truncate. At 1440/1920 the split is
   balanced.
3. **Route scroll is retained.** At 768 px, scrolling TTS to its bottom (`scrollTop=333`) and
   navigating through the sidebar to STT leaves STT at `scrollTop=95`; its heading renders at
   `top=-71`. `DashboardLayout` owns one persistent scroll element around `<Outlet>`, but it does
   not reset that element when `pathname` changes.
4. **Missing STT replay.** `useAudioRecorder` correctly hands the finished recording to the same
   `File` state used by uploads, but `SttForm` only prints the filename. No `<audio>` element or
   object URL exists, despite AC-3 requiring replay.
5. **Code/reference tabs.** Their wide tables and code blocks use intentional local horizontal
   scrollers; they do not widen the main pane. No change is needed there.

## Ranked hypotheses and results

| Rank | Hypothesis | Check | Result |
|---|---|---|---|
| 1 | Implicit one-column CSS grid uses an auto/min-content track on mobile. | Compare grid and form computed widths. | Confirmed: 343 px grid, 401.25 px form. |
| 2 | Workbench breakpoint ignores the persistent desktop sidebar. | Compare screenshots and main width at 1024 vs 1440. | Confirmed: split is cramped only at 1024. |
| 3 | Shared outlet scroller survives SPA navigation. | Scroll TTS, click STT, read `scrollTop` and heading rect. | Confirmed: STT opens at 95 px, heading above viewport. |
| 4 | Nested route-local overflow creates the document scrollbar. | Enumerate scroll owners and document dimensions. | Rejected after prior shell correction: document equals viewport; only nav and main are owners. |

## Root causes

- The identical route wrappers in `Stt.tsx`, `Llm.tsx`, and `Tts.tsx` declare only the desktop
  grid tracks. Their implicit mobile track is `auto`, so form min-content wins over available width.
  The same wrapper uses `lg`, which responds to viewport width rather than usable width after the
  sidebar.
- `DashboardLayout.tsx` provides the correct single content scroll owner, but has no pathname-based
  scroll restoration for its persistent outlet container.
- `SttForm.tsx` receives the final recording/upload as a `File` but never creates a revocable object
  URL or renders native playback.

## Reuse inventory and smallest design

| Need | Reuse / decision |
|---|---|
| Shared request/result layout | Add one `PlaygroundWorkbench` common component because exactly all three routes use it. It owns `minmax(0,1fr)`, `min-w-0`, the `xl` split, gap, and sticky result. |
| Scroll owner | Keep the existing DashboardLayout pane; add route-change restoration there. |
| Audio playback | Native `<audio controls>` in STT; no library, waveform, or persistence. Object URL is revoked on replacement/unmount. |
| Code/reference overflow | Keep `EndpointReference` and `SnippetPanel` local horizontal scrolling unchanged. |

No API, service, dependency, route, storage, or README setup change is required.

## After evidence

- At 375 px, all three pages now have a 343 px workbench and 343 px form inside the 375 px pane.
- At 1024 px, the request and result remain stacked; at 1440 and 1920 px they use the balanced split.
- Navigating from TTS at `scrollTop=333` to STT produces `scrollTop=0` and a visible heading.
- The five-width route sweep passed all 15 route/viewport combinations, and every screenshot was
  visually inspected.
