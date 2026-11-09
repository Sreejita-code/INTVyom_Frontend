# Plan — playground icons and spacing

**Status:** awaiting approval

1. Add regression coverage proving the playground shell is content-sized and each form exposes its
   primary section icons accessibly.
2. Update `PlaygroundShell` to retain normal top/side page padding and real bottom breathing room for
   long or expanded content.
3. Add restrained icon-and-label heading rows to STT, LLM, and TTS sections using existing Lucide
   icons, semantic colors, and the design system's `gap-2` rhythm.
4. Run focused tests, typecheck, targeted lint, build, and the three-route five-width browser sweep.
5. Open Optional configuration at mobile and desktop widths, scroll to the bottom, measure the gap,
   inspect screenshots, and document the result.

## Expected files

- `src/components/common/PlaygroundShell.tsx`
- `src/routes/dashboard/{stt,llm,tts}/*Form.tsx`
- Mirrored tests and this task's tracking files

## Risk

Low and visual-only. The main risk is changing height behavior for Code and Reference tabs; the
five-width route sweep covers all tab shell containment while focused tests protect the intended
class contract. No request or form behavior changes.
