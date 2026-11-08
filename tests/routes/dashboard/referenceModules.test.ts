import { describe, expect, it } from "vitest";

import { STT_REFERENCE } from "@/routes/dashboard/stt/sttReference";
import { LLM_REFERENCE } from "@/routes/dashboard/llm/llmReference";
import { TTS_REFERENCE } from "@/routes/dashboard/tts/ttsReference";

// The field names below are copied from the production API docs (api/stt.md, api/llm.md, api/tts.md).
// A test pins them so a drift in the reference page shows up here.
const names = (fields: { name: string }[]) => fields.map((f) => f.name);

describe("reference modules match the documented fields", () => {
  it("STT", () => {
    expect(names(STT_REFERENCE.request)).toEqual(["file", "assistant_id", "provider", "model", "language"]);
    expect(names(STT_REFERENCE.response)).toEqual([
      "text", "language", "duration_seconds", "provider", "model", "usage",
    ]);
    expect(STT_REFERENCE.errors.map((e) => e.status)).toEqual([400, 401, 404, 413, 422, 502]);
  });

  it("LLM", () => {
    expect(names(LLM_REFERENCE.request)).toEqual([
      "messages", "assistant_id", "provider", "model", "temperature", "max_tokens", "stream",
    ]);
    expect(names(LLM_REFERENCE.response)).toEqual(["message", "provider", "model", "usage"]);
    expect(LLM_REFERENCE.errors.map((e) => e.status)).toEqual([400, 401, 404, 422, 502]);
  });

  it("TTS", () => {
    expect(names(TTS_REFERENCE.request)).toEqual([
      "text", "assistant_id", "provider", "model", "voice", "language", "save_to_library", "response_format",
    ]);
    expect(names(TTS_REFERENCE.response)).toEqual(["audio_base64", "media_type", "provider", "model", "usage"]);
    expect(TTS_REFERENCE.errors.map((e) => e.status)).toEqual([400, 401, 404, 422, 502]);
  });
});
