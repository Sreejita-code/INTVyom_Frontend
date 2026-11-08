import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callChatEndpoint, callChatStreamEndpoint, condenseChatResponse } from "@/services/llm/llmService";

describe("chat endpoints", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends JSON with stream false and omits unset options", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: {} }));
    await callChatEndpoint({ request: { messages: [{ role: "user", content: "hi" }], temperature: 0.5 } });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(String(init.body));
    expect(sent).toEqual({ messages: [{ role: "user", content: "hi" }], temperature: 0.5, stream: false });
  });

  it("streams: returns the response so the caller can read the body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("data: [DONE]\n\n", { headers: { "Content-Type": "text/event-stream" } }));
    const res = await callChatStreamEndpoint({ request: { messages: [{ role: "user", content: "hi" }] } });
    expect(res.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).stream).toBe(true);
    expect(await res.response?.text()).toContain("[DONE]");
  });

  it("stops a stream when aborted, without treating it as an error", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      controller.abort();
      throw new DOMException("aborted", "AbortError");
    });
    const outcome = await callChatStreamEndpoint({
      request: { messages: [{ role: "user", content: "hi" }] },
      signal: controller.signal,
    }).catch((err: unknown) => err);
    expect(outcome).toBeInstanceOf(DOMException);
    expect((outcome as DOMException).name).toBe("AbortError");
  });
});

describe("condenseChatResponse", () => {
  it("maps the message and usage, keeping nulls", () => {
    const result = condenseChatResponse({
      data: {
        message: { role: "assistant", content: "We offer voice AI." },
        provider: "openai",
        model: "gpt-5.4",
        usage: { prompt_tokens: 24, completion_tokens: null, total_tokens: 40, estimated_cost_usd: 0.00019, pricing_complete: true },
      },
    });
    expect(result.message).toEqual({ role: "assistant", content: "We offer voice AI." });
    expect(result.usage.completionTokens).toBeNull();
    expect(result.usage.pricingComplete).toBe(true);
  });
});
