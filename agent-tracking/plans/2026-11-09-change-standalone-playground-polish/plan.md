# Delta plan — standalone playground polish

**Status:** approved by user, 2026-11-09

## Outcome

Turn the three standalone Try it pages into a task-first workbench while preserving their API
contracts, code/reference tabs, free-text flexibility, and current working-tree improvements.

## Proposed change

1. Lock the behavior with route tests for the new hierarchy/disclosure contract and retain the
   existing convergence tests for suggestions, samples, storage, and focus.
2. Refine `PlaygroundShell` into the common page frame: consistent page title, endpoint identity,
   tab sizing, readable max width, and responsive spacing using existing tokens only.
3. Recompose each route's Try it view:
   - primary task card first (audio, conversation, or text), with the main action close to it;
   - a compact request-configuration section for provider-specific choices;
   - optional assistant/key configuration behind one accessible disclosure that keeps its values;
   - a result/status surface that is compact when empty and expands for real output.
4. Keep route-specific behavior route-local. Extract at most one shared disclosure or result-frame
   component after confirming identical use in all three pages; otherwise reuse primitives directly.
5. Finish and clean the in-progress convergence changes: catalog suggestions, sample conversation,
   focus restoration, storage assertions, shadcn selects, and test warning cleanup.
6. Verify targeted tests after each slice, then full test/typecheck/lint/build and real-browser route
   runs at all five widths. Inspect 375 and 1920 screenshots for every page.

## Expected files

- `specs/001-standalone-stt-llm-tts/spec.md`
- `src/components/common/PlaygroundShell.tsx`
- `src/routes/dashboard/{stt,llm,tts}/{Stt,Llm,Tts}{,Form,Result}.tsx`
- `src/routes/dashboard/{stt,llm,tts}/*Rules.ts`
- `src/components/common/{AssistantPicker,ProviderKeyField}.tsx`
- `tests/routes/dashboard/{stt,llm,tts}/*.test.tsx`
- Shared component/test only if the three-call-site reuse threshold is met
- Tracking progress/report; README/AGENTS only if structure changes

## Risks and controls

- Collapsing optional controls could hide active values: the disclosure summary will state when
  overrides are active, and tests will prove collapse preserves values.
- Moving actions can regress keyboard flow: role/name/focus tests plus browser tab-order review.
- Existing user edits could be overwritten: retain the current diff and evolve it in small slices.
- A shared abstraction could make three distinct forms harder to edit: extract only identical UI
  with three current callers.

## Not included

No endpoint/service rewrite, new dependency, theme replacement, request history, or unrelated lint
cleanup.
