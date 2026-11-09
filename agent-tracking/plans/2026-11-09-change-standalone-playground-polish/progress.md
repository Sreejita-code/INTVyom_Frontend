# Progress — standalone playground polish

## Analysis

Initial validator result:

```text
CRITICAL  agent-tracking/plans/2026-11-09-change-standalone-playground-polish/tasks.md  Spec: line missing or file not found ('')
```

The task metadata was added before re-running the gate. The draft-spec status is expected to remain
an approval blocker until the user approves the spec delta.

Second validator result:

```text
HIGH  specs/001-standalone-stt-llm-tts/spec.md  spec is not approved
MEDIUM  agent-tracking/plans/2026-11-09-change-standalone-playground-polish/tasks.md:7  step has no AC-n and no setup/docs/converge tag
MEDIUM  agent-tracking/plans/2026-11-09-change-standalone-playground-polish/tasks.md:16  step has no AC-n and no setup/docs/converge tag
```

The two metadata-only task labels were corrected. The remaining High is the deliberate approval
gate, not a design inconsistency.

| ID | Severity | Location | Finding | Resolution |
|---|---|---|---|---|
| A-1 | High (expected) | `spec.md` status | Draft delta cannot be implemented before approval. | Ask the user to approve the spec, plan, and checklist. |
| A-2 | None | AC-26–AC-29 / delta plan | Each new criterion maps to a test-first task and browser verification. | No change. |
| A-3 | None | Delta plan | No endpoint, service, dependency, route, or unrelated-page work is introduced. | No change. |
| A-4 | None | Terms | “Optional configuration”, “result surface”, and “workbench” are used consistently. | No change. |

## Approval

- Approved by the user on 2026-11-09.

## Implementation and verification

- Added the shared task-first shell, optional-configuration disclosure, compact result surface,
  and editable searchable suggestion input.
- Re-composed STT, LLM, and TTS as responsive request/result workbenches.
- Fixed the dashboard outlet to scroll vertically and applied the standard responsive page padding.
- `npm run test`: 70 files, 525 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; the existing large-chunk warning remains.
- `npm run lint`: unchanged baseline, 82 findings (74 errors, 8 warnings), none in changed
  application files.
- Browser: STT, LLM, and TTS passed at 375, 768, 1024, 1440, and 1920 px with no console
  errors or horizontal-overflow findings. Screenshots were read at 375 and 1920 px.

## Converge

| AC | Evidence | Code | Status |
|----|----------|------|--------|
| AC-1 | Route and navigation test suite passed | `src/routes/dashboard/navItems.ts` | met |
| AC-2 | PlaygroundShell tests passed | `src/components/common/PlaygroundShell.tsx` | met |
| AC-3 | STT route tests passed | `src/routes/dashboard/stt/SttForm.tsx` | met |
| AC-4 | STT route tests passed | `src/routes/dashboard/stt/Stt.tsx` | met |
| AC-5 | STT route tests passed | `src/routes/dashboard/stt/SttResult.tsx` | met |
| AC-6 | LLM route tests passed | `src/routes/dashboard/llm/LlmForm.tsx` | met |
| AC-7 | LLM route tests passed | `src/routes/dashboard/llm/LlmResult.tsx` | met |
| AC-8 | TTS route tests passed | `src/routes/dashboard/tts/TtsForm.tsx` | met |
| AC-9 | TTS route tests passed | `src/routes/dashboard/tts/TtsResult.tsx` | met |
| AC-10 | Three route storage/header tests passed | `src/components/common/ProviderKeyField.tsx` | met |
| AC-11 | Auth service and full route suites passed | `src/services/auth/authedFetch.ts` | met |
| AC-12 | Three route error-state tests passed | `src/components/common/ApiErrorPanel.tsx` | met |
| AC-13 | Snippet suites passed | `tests/routes/dashboard/playgroundSnippets.test.ts` | met |
| AC-14 | Reference component tests passed | `src/components/common/EndpointReference.tsx` | met |
| AC-15 | Reference copy tests passed | `tests/components/common/EndpointReference.test.tsx` | met |
| AC-16 | Busy/cancel route tests passed | `src/routes/dashboard/stt/SttForm.tsx` | met |
| AC-17 | Empty/sample route tests passed | `src/components/common/PlaygroundResult.tsx` | met |
| AC-18 | STT microphone tests passed | `src/routes/dashboard/stt/useAudioRecorder.ts` | met |
| AC-19 | AssistantPicker tests passed | `tests/components/common/AssistantPicker.test.tsx` | met |
| AC-20 | Focus-return and accessible-name route tests passed | `src/routes/dashboard/llm/LlmForm.tsx` | met |
| AC-21 | Browser screenshots read at all five widths; route checks passed | `.artifacts/screens/dashboard_stt-375.png` | met |
| AC-22 | Full 525-test suite passed | `src/App.tsx` | met |
| AC-23 | LLM streaming/raw-event test passed | `src/routes/dashboard/llm/LlmResult.tsx` | met |
| AC-24 | Provider suggestion/free-text tests passed | `src/components/common/SuggestionInput.tsx` | met |
| AC-25 | TTS library-warning test passed | `src/routes/dashboard/tts/TtsForm.tsx` | met |
| AC-26 | Task-group route tests and mobile screenshots passed | `src/routes/dashboard/stt/SttForm.tsx` | met |
| AC-27 | Disclosure/value-retention tests passed | `src/components/common/OptionalConfiguration.tsx` | met |
| AC-28 | Result-region tests and desktop screenshots passed | `src/components/common/PlaygroundResult.tsx` | met |
| AC-29 | Shared-component tests and all target screenshots passed | `src/components/common/PlaygroundShell.tsx` | met |

Drift scan: no new route, API field, persistence, dependency, or backend behaviour was added.
The implementation matches the approved delta plan and the project constitution/design-system
gates. The scroll-container fix is shared shell behaviour required by AC-21.

Verdict: Converged

## Follow-up verification — nested scroll and autofill

- Reproduced document overflow at 906 px in a 900 px viewport and traced it to sidebar content
  escaping the normal-flow dashboard viewport shell.
- After the fix, Chromium reports document `900/900`, `window.scrollY = 0`, and only the intended
  sidebar-navigation and dashboard-content scroll owners.
- Added regression tests for viewport containment and credential-safe autocomplete metadata; all
  5 focused tests pass.
- TTS passed real-browser checks at 375, 768, 1024, 1440, and 1920 px; the desktop screenshot was
  inspected and contains one dashboard content scroll path with blank model/language/key fields.
