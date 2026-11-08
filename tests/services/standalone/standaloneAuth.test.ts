import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The stored user is read from this map so real storage is never touched.
const store = vi.hoisted(() => ({ current: null as string | null }));

vi.mock("@/services/storage/storageService", () => ({
  getStoredUser: () => (store.current ? JSON.parse(store.current) : null),
  clearUser: () => {
    store.current = null;
  },
}));

import { callChatEndpoint } from "@/services/llm/llmService";
import { callSynthesizeEndpoint } from "@/services/tts/ttsService";
import { callTranscribeEndpoint } from "@/services/stt/sttService";

const headersOf = (call: unknown[]) => new Headers((call[1] as RequestInit | undefined)?.headers);

describe("standalone services identify the caller by bearer key (AC-11)", () => {
  const fetchMock = vi.fn();
  const assign = vi.fn();

  beforeEach(() => {
    store.current = JSON.stringify({ user_id: "u1", user_name: "A", api_key: "key-123" });
    fetchMock.mockReset();
    assign.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { pathname: "/dashboard/llm", assign });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("sends the Bearer key from all three services", async () => {
    fetchMock.mockImplementation(async () => Response.json({ success: true, data: {} }));
    await callChatEndpoint({ request: { messages: [{ role: "user", content: "hi" }] } });
    await callSynthesizeEndpoint({ request: { text: "hi", saveToLibrary: false, responseFormat: "json" } });
    await callTranscribeEndpoint({ request: { file: new File(["x"], "a.wav") } });
    for (const call of fetchMock.mock.calls) {
      expect(headersOf(call as unknown[]).get("Authorization")).toBe("Bearer key-123");
    }
  });

  it("a 401 clears the session and returns to sign-in", async () => {
    fetchMock.mockImplementation(async () => Response.json({ error: "Unauthorized" }, { status: 401 }));
    await callChatEndpoint({ request: { messages: [{ role: "user", content: "hi" }] } });
    expect(store.current).toBeNull();
    expect(assign).toHaveBeenCalledWith("/auth");
  });
});
