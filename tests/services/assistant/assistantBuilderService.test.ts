import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callAssistantBillableMinutesEndpoint,
  callCreateAssistantEndpoint,
  callUpdateAssistantEndpoint,
  callGetTemplateEndpoint,
  callListTemplatesEndpoint,
  callValidateAssistantEndpoint,
  condenseBillableMinutesResponse,
  condenseTemplateResponse,
  condenseTemplatesResponse,
  condenseValidationResponse,
} from "@/services/assistant/assistantService";

describe("assistant builder endpoints", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const lastUrl = () => String(fetchMock.mock.calls.at(-1)?.[0]);

  it("posts the configuration to the dry-run endpoint", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { is_valid: true } }));

    await callValidateAssistantEndpoint({ assistant_mode: "pipeline" });

    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(lastUrl()).toMatch(/\/api\/assistant\/validate$/);
  });

  it("loads a template by id", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: {} }));

    await callGetTemplateEndpoint("realtime-gemini");

    expect(lastUrl()).toMatch(/\/api\/assistant\/templates\/realtime-gemini$/);
  });

  it("asks for billable minutes of one number", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { total_billable_minutes: 1 } }));

    await callAssistantBillableMinutesEndpoint({ assistantId: "a1", toNumber: "+919999999999" });

    expect(lastUrl()).toMatch(/\/api\/assistant\/billable-minutes\/a1\?to_number=%2B919999999999$/);
  });

  it("throws the backend error for a failed request", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "to_number query parameter is required" }, { status: 400 }));

    await expect(callAssistantBillableMinutesEndpoint({ assistantId: "a1", toNumber: "" })).rejects.toThrow(/to_number/);
  });

  it("lists templates through the list endpoint", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: [] }));

    await callListTemplatesEndpoint();

    expect(lastUrl()).toMatch(/\/api\/assistant\/templates$/);
  });
});

describe("assistant builder condensers", () => {
  it("reads an invalid dry run with the backend's reason and suggestions, dropping the notes", () => {
    const json = {
      success: true,
      message: "LLM provider 'gemini' is not supported in pipeline mode.",
      data: { is_valid: false, suggestions: { llm: "Try: openai", llm_notes: "Gemini cannot run text-only." } },
    };

    expect(condenseValidationResponse(json)).toEqual({
      valid: false,
      message: "LLM provider 'gemini' is not supported in pipeline mode.",
      suggestions: ["Try: openai"],
    });
  });

  it("reads a valid dry run", () => {
    expect(condenseValidationResponse({ message: "Configuration is valid", data: { is_valid: true, suggestions: null } }))
      .toEqual({ valid: true, message: "Configuration is valid", suggestions: [] });
  });

  it("keeps only well-formed templates", () => {
    const json = { data: [{ id: "realtime-gemini", name: "Realtime Gemini Assistant", description: "d" }, { name: "no id" }] };

    expect(condenseTemplatesResponse(json)).toEqual([{ id: "realtime-gemini", name: "Realtime Gemini Assistant", description: "d" }]);
    expect(condenseTemplatesResponse({ error: "x" })).toEqual([]);
  });

  it("returns a template's configuration only", () => {
    expect(condenseTemplateResponse({ data: { id: "t", configuration: { assistant_mode: "realtime" } } })).toEqual({ assistant_mode: "realtime" });
  });

  it("reads billable minutes as a number", () => {
    expect(condenseBillableMinutesResponse({ data: { total_billable_minutes: 12.5 } })).toBe(12.5);
    expect(condenseBillableMinutesResponse({ data: {} })).toBe(0);
  });
});

describe("create and update errors", () => {
  const fetchMock = vi.fn();
  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => vi.unstubAllGlobals());

  it("adds the backend's suggestion to a rejected save, without the notes", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json(
        { error: "LLM provider 'gemini' is not supported in pipeline mode.", suggestions: { llm: "Try: openai", llm_notes: "long" } },
        { status: 400 },
      ),
    );

    await expect(callCreateAssistantEndpoint({})).rejects.toThrow(
      "LLM provider 'gemini' is not supported in pipeline mode. Try: openai",
    );
    await expect(callUpdateAssistantEndpoint("a1", {})).rejects.toThrow(/Try: openai$/);
  });
});
