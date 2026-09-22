import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callAssistantBillableMinutesEndpoint,
  callGetTemplateEndpoint,
  callListTemplatesEndpoint,
  callValidateAssistantEndpoint,
} from "@/services/assistant/assistantService";

describe("assistant builder endpoints", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const lastUrl = () => String(fetchMock.mock.calls.at(-1)?.[0]);

  it("reports an invalid configuration with the backend's reason and suggestions", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        success: true,
        message: "LLM provider 'gemini' is not supported in pipeline mode.",
        data: { is_valid: false, suggestions: { llm: "Try: openai" } },
      }),
    );

    const result = await callValidateAssistantEndpoint({ assistant_mode: "pipeline" });

    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(lastUrl()).toMatch(/\/api\/assistant\/validate$/);
    expect(result).toEqual({
      valid: false,
      message: "LLM provider 'gemini' is not supported in pipeline mode.",
      suggestions: ["Try: openai"],
    });
  });

  it("reports a valid configuration", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, message: "Configuration is valid", data: { is_valid: true, suggestions: null } }));

    expect(await callValidateAssistantEndpoint({})).toEqual({ valid: true, message: "Configuration is valid", suggestions: [] });
  });

  it("lists templates and loads one's configuration", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ success: true, data: [{ id: "realtime-gemini", name: "Realtime Gemini Assistant", description: "d" }] }),
    );
    expect(await callListTemplatesEndpoint()).toEqual([{ id: "realtime-gemini", name: "Realtime Gemini Assistant", description: "d" }]);

    fetchMock.mockResolvedValueOnce(
      Response.json({ success: true, data: { id: "realtime-gemini", name: "R", description: "d", configuration: { assistant_mode: "realtime" } } }),
    );
    expect(await callGetTemplateEndpoint("realtime-gemini")).toEqual({ assistant_mode: "realtime" });
    expect(lastUrl()).toMatch(/\/api\/assistant\/templates\/realtime-gemini$/);
  });

  it("reads billable minutes for one number of one assistant", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { total_billable_minutes: 12.5 } }));

    expect(await callAssistantBillableMinutesEndpoint({ assistantId: "a1", toNumber: "+919999999999" })).toBe(12.5);
    expect(lastUrl()).toMatch(/\/api\/assistant\/billable-minutes\/a1\?to_number=%2B919999999999$/);
  });

  it("throws the backend error for a failed lookup", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "to_number query parameter is required" }, { status: 400 }));

    await expect(callAssistantBillableMinutesEndpoint({ assistantId: "a1", toNumber: "" })).rejects.toThrow(/to_number/);
  });
});
