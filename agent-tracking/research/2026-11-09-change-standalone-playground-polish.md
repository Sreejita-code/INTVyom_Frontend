# Research — standalone playground polish

## Sources read

- `AGENTS.md`, `README.md`, the mandatory repository skills, Spec 001 and its original plan/tasks.
- Commit `fefad66` and every current working-tree diff for STT, LLM, TTS, shared playground parts,
  and their route tests.
- The three route folders and their shared components, plus `src/index.css` and
  `tailwind.config.ts`.
- Browser screenshots for STT, LLM, and TTS at 375 and 1920 px; Assistant and Developer at 1920 px
  as in-product references.

## Baseline — current working tree

| Check | Exact result |
|---|---|
| `npm run test` | 69 files passed; 518 tests passed |
| `npm run typecheck` | clean |
| `npm run lint` | 82 problems (74 errors, 8 warnings), exactly the documented pre-existing baseline |
| `npm run build` | succeeds; main JS 2,075.42 kB, gzip 586.41 kB; existing >500 kB warning |
| route driver | STT, LLM, TTS each pass at 375/768/1024/1440/1920; zero overflow/console failures |
| `git diff --check` | clean |

The test run also prints pre-existing/noisy warnings plus new `act(...)` warnings in the modified
standalone route tests. They do not fail the suite, but the touched tests should not add warning
noise when this change is finished.

## Findings in scope

1. The 1920 px Try it view assigns a full second column to a short empty-state panel, leaving a
   visually empty half-page while the form becomes a long stack in the first column.
2. At 375 px, provider and technical configuration pushes the primary submit action below several
   screens. The page communicates API shape before the user's task.
3. Optional assistant inheritance and the ephemeral provider key are presented as a full peer
   section even when most users do not need either.
4. The current uncommitted pass improves spacing, headings, provider selects, suggestions, sample
   actions, storage assertions, and focus tests, but it still preserves the schema-first hierarchy.
5. Repeated card markup across three forms is visually similar but behavior-specific. A small
   shared disclosure/result-frame seam is justified only if all three pages use it; the forms
   themselves should remain route-local.
6. Focus restoration through an effect is valid DOM synchronization, but the implementation and
   tests should be made warning-free and consistent across cancel/stop paths.
7. The spec incorrectly asked for light-theme verification although VoiceKit ships one dark theme.

## Impact map

- Spec: AC-10, AC-17, AC-20, AC-21, AC-24 and new AC-26–AC-29.
- Original plan: Design, States per view, Accessibility/devices, Reuse inventory, Verification.
- Shared UI: `PlaygroundShell`, `AssistantPicker`, `ProviderKeyField`, and at most one small shared
  disclosure/result component if reuse is proven across all three pages.
- Route UI: `src/routes/dashboard/{stt,llm,tts}/` form, result, rules, and page composition files.
- Tests: the three mirrored route suites plus shared-component tests when a shared seam changes.
- Docs: no README/AGENTS structure update unless a file is added or moved.

## Ruled out

- No new dependency, global store, design token, route, or backend/service contract is needed.
- No need to refactor the service layer; its call/condense boundary is sound and covered.
- No reason to touch other dashboard routes to achieve visual consistency.
## Follow-up: nested scroll and credential autofill

The reported second scrollbar was reproducible at 1920 × 900. Chromium measured the document at
906 px against a 900 px viewport. The sidebar's final navigation item ended at 906.5 px; the
dashboard root participated in normal document flow, allowing that internally scrolling child to
increase the document scroll range. Making the viewport shell fixed (`inset-0`) and containing the
sidebar reduced the document measurement to exactly 900/900, with only the sidebar navigation and
main content pane remaining as intentional scroll owners.

Chrome also classified the optional provider key as a login password and used the nearest
unannotated text input as its username, which placed the saved email in Language. The provider key
now uses `autocomplete="new-password"`; suggestion inputs have stable names and
`autocomplete="off"`.

