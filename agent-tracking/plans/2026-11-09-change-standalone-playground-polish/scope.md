# Scope — 2026-11-09-change-standalone-playground-polish

## Request

Review the last commit and the changes currently present, then improve the standalone STT, LLM,
and TTS UI and implementation because the pages are not polished or as user-friendly as the rest
of VoiceKit.

## Agreed scope inherited from Spec 001

- Keep the three existing routes, endpoint contracts, snippets, and reference content.
- Keep the VoiceKit dark neon-cyber design system and existing dependencies.
- Preserve free-text model, voice, and language values even when suggestions are available.
- Do not alter backend behavior, authentication, storage keys, or unrelated dashboard pages.

## Change scope awaiting approval

- Rework the Try it hierarchy around the primary task and action.
- Progressively disclose optional provider/account configuration without losing values.
- Make request/result states read as a balanced workbench on desktop and a clear sequence on mobile.
- Finish the already-started AC-10, AC-17, AC-20, AC-21, and AC-24 convergence work.
- Consolidate repeated presentation only where all three routes have the same need; do not create a
  speculative form framework.

## Out of scope

- New routes, dependencies, backend changes, request history, or a theme redesign.
- Unrelated lint debt and unrelated test warnings.
