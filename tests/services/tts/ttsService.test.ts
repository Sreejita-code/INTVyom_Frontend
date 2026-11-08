import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callSynthesizeEndpoint,
  condenseSynthesizeAudioResponse,
  condenseSynthesizeJsonResponse,
} from "@/services/tts/ttsService";

describe("callSynthesizeEndpoint", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends the request with the chosen response format", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: {} }));
    await callSynthesizeEndpoint({ request: { text: "hi", saveToLibrary: false, responseFormat: "json" } });
    const sent = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(sent).toEqual({ text: "hi", save_to_library: false, response_format: "json" });
  });

  it("returns the audio blob and headers for the audio format", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/wav", "X-TTS-Characters": "31" } }),
    );
    const res = await callSynthesizeEndpoint({ request: { text: "hi", saveToLibrary: false, responseFormat: "audio" } });
    expect(res.ok).toBe(true);
    expect(res.blob?.size).toBe(3);
    expect(res.headers?.get("X-TTS-Characters")).toBe("31");
  });

  it("reads an error body as JSON even for the audio format", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "Text too long" }, { status: 422 }));
    const res = await callSynthesizeEndpoint({ request: { text: "x", saveToLibrary: false, responseFormat: "audio" } });
    expect(res).toMatchObject({ ok: false, status: 422, json: { error: "Text too long" } });
  });
});

describe("condenseSynthesizeJsonResponse", () => {
  it("decodes base64 audio into a blob and maps usage", async () => {
    const audio = btoa("RIFFtest");
    const result = condenseSynthesizeJsonResponse({
      data: {
        audio_base64: audio,
        media_type: "audio/wav",
        provider: "cartesia",
        model: "sonic-3",
        usage: { characters_count: 31, audio_duration_seconds: 2, estimated_cost_usd: 0.000157, pricing_complete: true },
      },
    });
    expect(result.mediaType).toBe("audio/wav");
    expect(result.audio.size).toBe(8);
    expect(result.usage).toEqual({
      charactersCount: 31,
      audioDurationSeconds: 2,
      estimatedCostUsd: 0.000157,
      pricingComplete: true,
    });
  });
});

describe("condenseSynthesizeAudioResponse", () => {
  it("reads usage from the X-TTS headers", () => {
    const headers = new Headers({
      "Content-Type": "audio/wav",
      "X-TTS-Characters": "31",
      "X-Audio-Duration": "2.000",
      "X-Estimated-Cost-USD": "0.000157",
      "X-Pricing-Complete": "true",
      "X-Provider": "cartesia",
      "X-Model": "sonic-3",
    });
    const result = condenseSynthesizeAudioResponse(new Blob([new Uint8Array(4)], { type: "audio/wav" }), headers);
    expect(result.usage).toEqual({ charactersCount: 31, audioDurationSeconds: 2, estimatedCostUsd: 0.000157, pricingComplete: true });
    expect(result.provider).toBe("cartesia");
    expect(result.model).toBe("sonic-3");
  });

  it("returns usage null when no usage header is readable", () => {
    const result = condenseSynthesizeAudioResponse(new Blob([new Uint8Array(1)]), new Headers({ "Content-Type": "audio/wav" }));
    expect(result.usage).toBeNull();
  });
});
