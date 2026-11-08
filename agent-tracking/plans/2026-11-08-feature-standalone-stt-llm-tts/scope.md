# Scope — 2026-11-08-feature-standalone-stt-llm-tts

## Request (verbatim)

> Take a look into the MCPs of INT voice QTPA docs and P production MCP, and you will see there are three things that have been introduced: a standalone STT, a standalone LLM, a standalone TTS. We need to implement it here so that users can come and also use those things. Users can take the code snippet and use it in their code and everything. For example, for HTTP, a user can come, record a voice, send it, and get back the results and all those kinds of things. You can also take a look into the response schemas and everything, how it is coming, and properly design it and properly add it so the users can understand everything, all the payloads, and everything.

Task type: `feature`. Invoked through `/core-fe-plan`.

## Agreed scope

| Item | Answer |
|------|--------|
| Spec | specs/001-standalone-stt-llm-tts/spec.md |
| Target | three new dashboard routes (STT, LLM, TTS), services, types, nav entries |
| Out of scope | see spec |
| Constraints | `specs/constitution.md` v1.0.0 |

## Clarification log

- Constitution: keep 6 starter principles and add #7 repo conventions. Answered.
- Layout: three routes. Answered.
- v1 scope: try-it panel, code snippets, payload reference, `X-Provider-API-Key` field, plus anything else that helps the user. Answered.
- Q2 suggested values: default taken (suggest from app catalogue, free text allowed).
- Q3 TTS `audio` usage: resolved by upstream docs, shown for both formats (supersedes default).
- Q4 Analytics: default taken (backend matter).
- Q5 `save_to_library`: default taken (off, with warning).
- Q1 SSE event shape: resolved from upstream docs api/llm.md. TTS usage headers resolved from api/tts.md.
