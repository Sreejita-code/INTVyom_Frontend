import { describe, expect, it } from "vitest";

import { buildLlmSpec } from "@/routes/dashboard/llm/llmSnippet";
import { buildSttSpec } from "@/routes/dashboard/stt/sttSnippet";
import { buildTtsSpec } from "@/routes/dashboard/tts/ttsSnippet";
import { renderSnippet } from "@/lib/apiSnippet";

const options = { baseUrl: "https://api.example.com", apiKey: "$VOICEKIT_API_KEY" };

describe("STT snippet (AC-13)", () => {
  it("sends the file as multipart and includes only the options set", () => {
    const spec = buildSttSpec({ provider: "sarvam", model: "", language: "en-IN", assistantId: "" });
    expect(spec.form?.file).toEqual({ field: "file", filename: "recording.wav" });
    expect(spec.form?.fields).toEqual({ provider: "sarvam", model: undefined, language: "en-IN", assistant_id: undefined });
    expect(renderSnippet("curl", spec, options)).toContain("-F 'file=@recording.wav'");
  });
});

describe("LLM snippet (AC-13)", () => {
  const values = {
    messages: [{ role: "user" as const, content: "hi" }],
    provider: "openai" as const,
    temperature: 0.7,
    maxTokens: undefined,
  };

  it("builds a JSON body with stream false by default", () => {
    const spec = buildLlmSpec(values, false);
    expect(spec.body).toEqual({ messages: values.messages, provider: "openai", temperature: 0.7, stream: false });
    expect(spec.response).toBeUndefined();
  });

  it("builds the streaming variant with stream true and the stream response", () => {
    const spec = buildLlmSpec(values, true);
    expect(spec.body).toMatchObject({ stream: true });
    expect(spec.response).toBe("stream");
    expect(renderSnippet("python", spec, options)).toContain("iter_lines()");
  });
});

describe("TTS snippet (AC-13)", () => {
  const values = { text: "hello", provider: "cartesia" as const, voice: "", saveToLibrary: false };

  it("json format prints the response, audio format saves a file", () => {
    const json = buildTtsSpec(values, "json");
    expect(json.response).toBeUndefined();
    expect(json.body).toMatchObject({ response_format: "json" });
    const audio = buildTtsSpec(values, "audio");
    expect(audio.response).toBe("binary");
    expect(renderSnippet("node", audio, options)).toContain('writeFile("speech.wav"');
  });

  it("omits unset voice", () => {
    expect(buildTtsSpec(values, "audio").body).not.toHaveProperty("voice");
  });
});
