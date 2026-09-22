import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callGetIntegrationEndpoint, condenseIntegrationResponse } from "@/services/integration/integrationService";

describe("condenseIntegrationResponse", () => {
  it("keeps only a masked preview of the provider key", () => {
    const json = { success: true, data: { service_type: "llm", service_name: "openai", api_key: "sk-live-abcdef1234" } };

    const integration = condenseIntegrationResponse(json);

    expect(integration).toEqual({ service_type: "llm", service_name: "openai", api_key_preview: "***1234" });
    expect(JSON.stringify(integration)).not.toContain("sk-live");
  });

  it("uses the backend's preview when it already sends one", () => {
    const json = { success: true, data: { service_type: "llm", service_name: "openai", api_key_preview: "***9999" } };

    expect(condenseIntegrationResponse(json)?.api_key_preview).toBe("***9999");
  });

  it("returns null when nothing is stored", () => {
    expect(condenseIntegrationResponse({ error: "Integration not found" })).toBeNull();
  });
});

describe("callGetIntegrationEndpoint", () => {
  const fetchMock = vi.fn();
  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => vi.unstubAllGlobals());

  it("reports the status so a 404 can mean 'not connected' and nothing else", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "boom" }, { status: 500 }));

    expect(await callGetIntegrationEndpoint({ serviceName: "openai" })).toMatchObject({ ok: false, status: 500 });
  });
});
