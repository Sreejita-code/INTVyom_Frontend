# Spec 001 — Standalone STT, LLM and TTS

- **Status:** implemented — change approved and verified, 2026-11-09
- **Owner:** VoiceKit frontend maintainers
- **Last changed:** 2026-11-09

## Summary

The backend now exposes three standalone endpoints that work without an assistant or a call:
speech-to-text (`POST /api/stt/transcribe`), LLM chat (`POST /api/llm/chat`) and
text-to-speech (`POST /api/tts/synthesize`). Developers need a place in the dashboard to try each
one with their own key, see the exact request and response, and copy working code into their own
project. Each of the three gets its own page with a try-it panel, ready-to-copy snippets, and a
full payload reference.

## Users and stories

- As a developer, I can record my voice or upload an audio file and see the transcript, so that I can judge an STT provider before using it.
- As a developer, I can send chat messages to an LLM and watch the answer stream in, so that I can judge a model's output, speed and cost.
- As a developer, I can type text, pick a provider and voice, and play the result, so that I can judge a TTS voice.
- As a developer, I can copy a snippet (curl, Python, JavaScript) that matches exactly what I configured on the page, so that I can paste it into my code.
- As a developer, I can see every request field, every response field, and every error with its meaning, so that I can handle each case in my own code.
- As a developer, I can see the cost and usage the API reports for each call, so that I can estimate my spend.

## Acceptance criteria

- **AC-1:** The sidebar and the command palette each list three new entries, STT, LLM and TTS. Choosing one opens its own page; an unauthenticated visitor is sent to sign in as on other dashboard pages.
- **AC-2:** Every page has three areas: Try it, Code, Reference. The user can switch between them and the choice survives a page reload within the session.
- **AC-3:** *STT input.* On the STT page the user can record from the microphone (start, stop, replay) or choose an audio file. Accepted types are wav, mp3, ogg, webm, m4a. A file over 25 MB is rejected on the page with a message before any request is sent.
- **AC-4:** *STT options.* The user can set provider (`sarvam`, `cartesia`, `deepgram`, `openai`, `elevenlabs`), model, language and an optional assistant to inherit configuration from. Unset options are not sent.
- **AC-5:** *STT result.* After a successful call the page shows the transcript text, detected language, duration, provider, model, and usage (`audio_duration_seconds`, `estimated_cost_usd`). When `pricing_complete` is false the page says the cost is partial. A `null` field shows as "not reported", never as `0`.
- **AC-6:** *LLM input.* On the LLM page the user can build a conversation of `system`, `user` and `assistant` messages, set provider (`openai`, `gemini`), model, `temperature` (0 to 2), `max_tokens` (1 or more), and an optional assistant to inherit from. Sending with no messages is blocked with a message.
- **AC-7:** *LLM result.* With stream off, the page shows the reply message, provider, model, and usage (`prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost_usd`, partial-pricing notice). With stream on, the reply text appears progressively as events arrive and the page shows when the stream has ended (`data: [DONE]`). The user can stop a running stream.
- **AC-8:** *TTS input.* On the TTS page the user can enter text of 1 to 5000 characters with a live character count, and set provider (`cartesia`, `sarvam`, `elevenlabs`, `mistral`), model, voice, language, save-to-library, and an optional assistant to inherit from. Empty or over-limit text blocks sending with a message.
- **AC-9:** *TTS result.* After a successful call the user can play and download the audio, and sees media type, provider, model and usage (`characters_count`, `audio_duration_seconds`, `estimated_cost_usd`, partial-pricing notice). The user can choose the response format (`audio` or `json`) and the page works with both. With `audio`, usage comes from the response headers `X-TTS-Characters`, `X-Audio-Duration`, `X-Estimated-Cost-USD`, `X-Pricing-Complete`, `X-Provider`, `X-Model`; if the browser cannot read them, the page says usage is only available with `json`.
- **AC-10:** *provider key.* Each Try it panel has an optional provider API key field. A key typed there is sent only as the `X-Provider-API-Key` header, is not stored in browser storage, is not shown in any snippet's output unless the user chooses to include it, and is cleared on page reload.
- **AC-11:** *auth key.* Calls use the signed-in user's VoiceKit API key. A `401` signs the user out and returns to the sign-in page, as on every other page.
- **AC-12:** *errors.* Each error status (`400`, `401`, `404`, `413`, `422`, `502`) shows the backend `error` message and, when present, the `suggestions` as readable hints, plus a plain-language explanation of what the user can do. A network failure shows its own message. The input is kept so the user can fix it and retry.
- **AC-13:** *snippets.* The Code area shows curl, Python and JavaScript for the page's endpoint. The snippet reflects the current options on the Try it panel (provider, model, and so on, only fields that are set), uses a placeholder for the API key, and has a copy button with confirmation. STT snippets use multipart upload; LLM snippets include a streaming variant; TTS snippets cover both response formats and show how to save the returned audio.
- **AC-14:** *reference.* The Reference area lists, per endpoint, the URL, method, headers (`Authorization`, `X-Provider-API-Key`), every request field with type, required or optional, allowed values and limits, the full success response with each field described (including which are nullable), a sample request and response, and a table of every error status with its cause.
- **AC-15:** *copy sample.* Every request and response sample in the Reference area can be copied.
- **AC-16:** *loading.* While a call runs the page shows progress, disables the send control, and offers cancel. A recording in progress shows elapsed time.
- **AC-17:** *empty.* Before the first call, the result area explains what will appear and offers a one-click sample (a short text for TTS, a starter conversation for LLM; STT offers the record button).
- **AC-18:** *mic denied.* If microphone permission is denied or unavailable, the STT page says so, explains how to allow it, and keeps file upload usable.
- **AC-19:** *assistant picker.* The optional assistant selector lists the user's assistants; with none it explains how to create one and the page still works without it. Choosing an assistant shows that its settings will be used for fields left blank.
- **AC-20:** *keyboard and names.* All controls are reachable by keyboard in reading order with visible focus. Record, stop, play, send, cancel and copy have accessible names. Results and errors are announced to screen readers. Recording and playback work without a mouse.
- **AC-21:** *devices.* All three pages are usable without horizontal page scroll at 375, 768, 1024, 1440 and 1920 px in the product's shipped dark theme.
- **AC-22:** *old path.* No existing route, sidebar entry or stored key changes behaviour.
- **AC-23:** *LLM raw events.* With stream on, the page also offers a "Raw events" view listing each event exactly as received, so the user sees the real payload whatever its shape.
- **AC-24:** *suggested values.* For model, voice and language, the page suggests the values the app already knows for the chosen provider, and always accepts any typed value.
- **AC-25:** *library warning.* `save_to_library` is off by default; turning it on shows a note that the audio may be stored in the user's Audio Library.
- **AC-26:** *task-first hierarchy.* In every Try it area, the page presents the task's primary input and action before provider-specific or account-specific configuration. At 375 px, a user can understand what to provide and how to run the request without first reading every optional field.
- **AC-27:** *progressive configuration.* Provider/model/language/voice controls remain available, while assistant inheritance and the one-request provider key are grouped as optional advanced configuration with a concise summary. Expanding or collapsing optional configuration never clears entered values.
- **AC-28:** *workbench result.* At desktop widths the request and result read as one balanced workbench; the empty result does not consume half the page as an otherwise blank panel. During and after a request, status, errors, output, usage, retry/cancel controls, and sample actions stay visually associated with the result.
- **AC-29:** *consistent polish.* The three pages use the existing VoiceKit page shell, semantic tokens, shadcn controls, spacing ladder, type scale, focus states, and shared standalone-page components. Equivalent controls and states have the same labels, layout treatment, and interaction pattern across STT, LLM, and TTS.

## States

| State | What the user sees and can do |
|-------|-------------------------------|
| Loading | Send disabled, progress shown, cancel available. LLM stream: partial text grows, stop available. STT: elapsed time while recording, then progress while uploading. |
| Empty | Short explanation of what appears after a call, plus a sample action. No assistants: hint to create one, page still works. |
| Error | Backend message, suggestions, what to do next, input kept, retry available. Mic denied and file too large have their own messages. |
| Partial data | Nullable fields show "not reported". `pricing_complete: false` shows a partial-cost notice. A stream that ends early or errors keeps the text received so far and says it was cut off. |

## Data

Source: the three endpoints above, documented in the production API docs (checked 2026-11-08).
All need the signed-in user's bearer key. Optional header `X-Provider-API-Key`.

- STT request: `multipart/form-data` with `file` (required), `assistant_id`, `provider`, `model`, `language`. Response `data`: `text`, `language`, `duration_seconds`, `provider`, `model`, `usage`.
- LLM request: JSON with `messages` (required, 1 or more), `assistant_id`, `provider`, `model`, `temperature`, `max_tokens`, `stream`. Response `data`: `message {role, content}`, `provider`, `model`, `usage`. Streaming: SSE ending with `data: [DONE]`.
- TTS request: JSON with `text` (required, 1 to 5000), `assistant_id`, `provider`, `model`, `voice`, `language`, `save_to_library`, `response_format`. Response: binary audio (`audio`) or `data {audio_base64, media_type, provider, model, usage}` (`json`).
- LLM stream events: `data: {"choices":[{"delta":{"content":"We"}}]}` per chunk, ending `data: [DONE]` (upstream LiveKit docs, `api/llm.md`).
- TTS `audio` response headers: `X-TTS-Characters`, `X-Audio-Duration`, `X-Estimated-Cost-USD`, `X-Pricing-Complete`, `X-Provider`, `X-Model` (upstream docs, `api/tts.md`).
- Each success response is wrapped `{ success, message, data }`. Each error is `{ error, suggestions? }`.
- No call is made on page load; calls happen only when the user sends. Results are not persisted.

## Accessibility and devices

- Keyboard and focus order: area switcher, options, input, send, result, copy. Recording controls reachable and operable with Space/Enter.
- Screen-reader names: record, stop, play, send, cancel, copy, each option field, result region, error region.
- Widths: 375 / 768 / 1024 / 1440 / 1920 · light + dark

## Design reference

none

## Out of scope

- Realtime or WebSocket speech, and live streaming of microphone audio.
- Saving history of past calls or results.
- Managing provider keys (exists under Provider Keys).
- Changes to the backend or its docs.

## Open questions

None.

## Change log

| Date | Change | Task slug |
|------|--------|-----------|
| 2026-11-08 | Created | 2026-11-08-feature-standalone-stt-llm-tts |
| 2026-11-08 | SSE event shape and TTS usage headers found in upstream docs `api/llm.md` and `api/tts.md`. AC-9 now shows usage for both formats. No open questions. | 2026-11-08-feature-standalone-stt-llm-tts |
| 2026-11-08 | Defaults taken for 4 questions: suggested values (AC-24), library warning (AC-25), TTS usage for `json` only (AC-9), Analytics is a backend matter. SSE shape still open (AC-23 added). | 2026-11-08-feature-standalone-stt-llm-tts |
| 2026-11-09 | Drafted the UI/implementation polish delta: corrected AC-21 to the shipped dark theme and added task-first hierarchy, progressive configuration, balanced results, and cross-page consistency (AC-26–AC-29). | 2026-11-09-change-standalone-playground-polish |
| 2026-11-09 | Implemented and verified the task-first workbench, searchable editable suggestions, progressive settings, shared result treatment, page spacing, and dashboard scrolling. | 2026-11-09-change-standalone-playground-polish |
