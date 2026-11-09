# Tasks — standalone playground scrolling and consistency
**Status:** approved (2026-11-09, by user)

## Goal

Make STT, LLM, and TTS use one predictable responsive workbench and scroll behavior, and let STT
users replay the exact audio they are about to transcribe.

## Checklist

- [x] 1. Add failing regression tests for mobile workbench containment, route-change scroll reset,
      and STT selected/recorded audio playback with object-URL cleanup.
- [x] 2. Add the small shared `PlaygroundWorkbench` layout and migrate STT, LLM, and TTS to it;
      use one bounded mobile track and defer the request/result split to `xl`.
- [x] 3. Reset the dashboard content pane to the top when the route pathname changes, without
      changing scroll position for interactions within the same page.
- [x] 4. Render a native STT audio player for the accepted file/recording and revoke replaced object
      URLs.
- [x] 5. Run focused tests and direct Chromium measurements: at 375 px every form must fit its grid
      and main `scrollWidth` must equal `clientWidth`; SPA navigation must land at scrollTop 0.
- [x] 6. Run full test, typecheck, lint comparison, build, and browser verification for all three
      routes at 375/768/1024/1440/1920; inspect every before/after screenshot.
- [x] 7. Sync tracking/report documentation and perform a fresh diff review against the proven root
      causes.

## Expected files

- `src/components/common/PlaygroundWorkbench.tsx` — one shared responsive layout used by 3 routes.
- `src/routes/dashboard/{stt,llm,tts}/*.tsx` — adopt the shared workbench; STT adds playback only.
- `src/routes/dashboard/DashboardLayout.tsx` — route scroll restoration.
- Mirrored tests under `tests/components/common/` and `tests/routes/dashboard/`.
- Tracking/report files for this task.

## Risk and rollback

Low UI-only blast radius. Request shapes and state contracts remain unchanged. Each root cause has
an independent test and can be reverted independently: workbench component/migrations, layout
scroll effect, or STT preview. No dependency or data migration is involved.
