import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callApplyTemplateEndpoint,
  callAssistantBillableMinutesEndpoint,
  callGetWizardStepEndpoint,
  callListWizardStepsEndpoint,
  callValidateWizardStepEndpoint,
  callWizardNavigationEndpoint,
  callWizardStatusEndpoint,
  condenseWizardNavigationResponse,
  condenseWizardStatusResponse,
  condenseWizardStepResponse,
  condenseWizardStepsResponse,
  condenseWizardValidationResponse,
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

describe("template apply", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts the body to the template's apply endpoint", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { external_assistant_id: "ext_1" } }, { status: 201 }));

    const json = await callApplyTemplateEndpoint("realtime-gemini", { assistant_name: "Concierge" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/assistant\/templates\/realtime-gemini\/apply$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ assistant_name: "Concierge" });
    expect(json).toMatchObject({ data: { external_assistant_id: "ext_1" } });
  });

  it("encodes the template id and adds the suggestion to a rejected apply", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "assistant_prompt is required", suggestions: { llm: "Try: openai" } }, { status: 400 }),
    );

    await expect(callApplyTemplateEndpoint("a/b", {})).rejects.toThrow("assistant_prompt is required Try: openai");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/templates\/a%2Fb\/apply$/);
  });
});

describe("builder wizard endpoints", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const lastUrl = () => new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
  const draft = { assistant_mode: "duplex" };

  it("passes the draft as a JSON config query on every read", async () => {
    // A fresh Response per call: a body can only be read once.
    fetchMock.mockImplementation(async () => Response.json({ success: true, data: [] }));

    await callListWizardStepsEndpoint(draft);
    expect(lastUrl().pathname).toMatch(/\/api\/assistant\/wizard\/steps$/);
    expect(JSON.parse(lastUrl().searchParams.get("config")!)).toEqual(draft);

    await callWizardStatusEndpoint(draft);
    expect(lastUrl().pathname).toMatch(/\/wizard\/status$/);

    await callGetWizardStepEndpoint("llm", draft);
    expect(lastUrl().pathname).toMatch(/\/wizard\/steps\/llm$/);

    await callWizardNavigationEndpoint("llm", draft);
    expect(lastUrl().pathname).toMatch(/\/wizard\/navigation$/);
    expect(lastUrl().searchParams.get("current_step")).toBe("llm");
    expect(JSON.parse(lastUrl().searchParams.get("config")!)).toEqual(draft);
  });

  it("sends an empty draft as {} rather than omitting it", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: {} }));

    await callWizardStatusEndpoint(undefined);

    expect(lastUrl().searchParams.get("config")).toBe("{}");
  });

  it("posts step_data and current_config to the step's validate endpoint", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { isValid: true, errors: [] } }));

    await callValidateWizardStepEndpoint("tts", { stepData: { assistant_tts_model: "sarvam" }, currentConfig: { assistant_mode: "pipeline" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/wizard\/steps\/tts\/validate$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      step_data: { assistant_tts_model: "sarvam" },
      current_config: { assistant_mode: "pipeline" },
    });
  });

  it("throws the backend error for a failed read", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

    await expect(callWizardStatusEndpoint(draft)).rejects.toThrow("Unauthorized");
  });

  it("condenses steps, dropping rows without an id", () => {
    expect(
      condenseWizardStepsResponse({
        data: [{ id: "llm", title: "Configure Language Model", description: "d", fields: ["assistant_llm_config"] }, { title: "no id" }],
      }),
    ).toEqual([{ id: "llm", title: "Configure Language Model", description: "d", fields: ["assistant_llm_config"] }]);
    expect(condenseWizardStepsResponse({})).toEqual([]);
  });

  it("condenses a step with its rules and provider hints", () => {
    const detail = condenseWizardStepResponse({
      data: {
        id: "llm",
        title: "LLM",
        description: "d",
        fields: ["assistant_llm_config"],
        validation_rules: { provider: { required: true, allowed_values: ["openai"] }, voice: {} },
        suggestions: { providers: [{ value: "openai", label: "OpenAI", description: "x" }] },
      },
    });

    expect(detail?.rules).toEqual({
      provider: { required: true, allowedValues: ["openai"] },
      voice: { required: false, allowedValues: [] },
    });
    expect(detail?.providers).toEqual([{ value: "openai", label: "OpenAI", description: "x" }]);
    expect(condenseWizardStepResponse({ data: {} })).toBeNull();
  });

  it("condenses navigation with null at the ends, status as booleans, and validation", () => {
    expect(
      condenseWizardNavigationResponse({ data: { next: { id: "interaction", title: "T", description: "", fields: [] }, previous: null } }),
    ).toEqual({ next: { id: "interaction", title: "T", description: "", fields: [] }, previous: null });
    expect(condenseWizardStatusResponse({ data: { mode: true, llm: false, tts: "yes" } })).toEqual({ mode: true, llm: false, tts: false });
    expect(condenseWizardValidationResponse({ data: { isValid: false, errors: ["bad"] } })).toEqual({ isValid: false, errors: ["bad"] });
    expect(condenseWizardValidationResponse({})).toEqual({ isValid: false, errors: [] });
  });
});
