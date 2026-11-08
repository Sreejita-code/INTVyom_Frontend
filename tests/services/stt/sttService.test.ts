import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callTranscribeEndpoint, condenseTranscribeResponse } from "@/services/stt/sttService";

describe("callTranscribeEndpoint", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(Response.json({ success: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts a multipart form with the file and only the set fields", async () => {
    const file = new File(["x"], "recording.webm", { type: "audio/webm" });
    await callTranscribeEndpoint({ request: { file, provider: "sarvam", language: undefined } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/stt\/transcribe$/);
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect((body.get("file") as File).name).toBe("recording.webm");
    expect(body.get("provider")).toBe("sarvam");
    expect(body.has("language")).toBe(false);
    expect(body.has("model")).toBe(false);
  });

  it("sends the provider key only as a header", async () => {
    const file = new File(["x"], "a.wav", { type: "audio/wav" });
    await callTranscribeEndpoint({ request: { file }, providerKey: "pk-1" });
    const headers = new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers);
    expect(headers.get("X-Provider-API-Key")).toBe("pk-1");
  });

  it("returns ok false with the body on an error status", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "too big" }, { status: 413 }));
    const file = new File(["x"], "a.wav", { type: "audio/wav" });
    const res = await callTranscribeEndpoint({ request: { file } });
    expect(res).toEqual({ ok: false, status: 413, json: { error: "too big" } });
  });
});

describe("condenseTranscribeResponse", () => {
  it("keeps nullable fields null and never invents zeros", () => {
    const result = condenseTranscribeResponse({
      data: {
        text: "hello",
        language: null,
        duration_seconds: null,
        provider: "sarvam",
        model: null,
        usage: { audio_duration_seconds: null, estimated_cost_usd: null, pricing_complete: false },
      },
    });
    expect(result.text).toBe("hello");
    expect(result.language).toBeNull();
    expect(result.usage).toEqual({ audioDurationSeconds: null, estimatedCostUsd: null, pricingComplete: false });
  });
});
