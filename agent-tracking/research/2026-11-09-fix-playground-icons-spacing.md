# Research — playground icons and spacing

## Baseline

- Current repository baseline from the immediately preceding completed fix: 72 files and 529 tests
  pass; typecheck and build pass; lint remains at 74 existing errors and 8 warnings.
- Browser route checks pass for STT, LLM, and TTS at 375, 768, 1024, 1440, and 1920 px.

## Reproduction

At 1440 × 900, expand Optional configuration and scroll the dashboard content pane to its maximum.
For STT, LLM, and TTS, `scrollHeight - scrollTop - clientHeight` is 0 and the final card's bottom is
exactly at y=900. Screenshots show the provider-key help text pressed against the viewport edge.

## Cause

`PlaygroundShell` combines `page-shell` (`h-full`) with padding. When its content grows beyond that
fixed-height box, the overflow extent ends at the child content rather than retaining useful bottom
breathing room. The issue is most visible when Optional configuration becomes the final expanded
card.

The page header, Result panel, and Optional configuration already render Lucide icons. The plain
form section headings in `SttForm`, `LlmForm`, and `TtsForm` do not, producing weaker hierarchy than
the assistant page's icon-led sections.

## Smallest correction

- Make the playground shell content-sized with `min-h-full` instead of fixed-height while retaining
  the existing page-padding utility.
- Add small semantic Lucide icons to section headings only; reuse existing token colors and spacing.
- Add regression checks for shell sizing and section icons, then verify the expanded bottom gap in
  Chromium.
