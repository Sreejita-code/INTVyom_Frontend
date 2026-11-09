# Scope — standalone playground scrolling and consistency

## Request

> take a look into all the pages.. thoser are cerated new. the tts,llm and stt.. all the apges..
> there are scrollingissues.. nad sandadizationissues and needs to be fixed

## Classification

- Type: fix
- Targets: `/dashboard/stt`, `/dashboard/llm`, `/dashboard/tts`, their shared playground shell,
  and the dashboard viewport/scroll owner when it directly causes these pages' defects.
- Symptom: inconsistent or nested scrolling and inconsistent layout/control treatment across the
  three newly created pages.
- Expected: one predictable content scroll owner, no document-level or horizontal scrolling,
  matching task/config/result structure and controls across equivalent states.
- Environment: signed-in dashboard in Chromium, localhost development build, shipped dark theme.
- Devices: 375, 768, 1024, 1440, and 1920 px.
- Constraint: proper root-cause fix, existing design system and dependencies only; preserve API
  behaviour and current user input semantics.
- Success: all three routes pass browser overflow/console checks at every target width, screenshots
  are visually consistent, and regression tests cover each proven root cause.
- STT addition from the user: after recording or selecting audio, provide a simple native playback
  control so the user can listen before transcribing. No waveform or new dependency.
- Output: Markdown report.

## Scope confirmation

Confirmed by the user on 2026-11-09 ("continue").
The user then explicitly added STT playback of the recorded/selected voice to this audit.
