import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callGetIntegrationEndpoint, condenseIntegrationResponse } from "@/services/integration/integrationService";

describe("condenseIntegrationResponse", () => {
  it("keeps the last four characters of the backend's masked preview", () => {
    const json = { success: true, data: { service_type: "llm", service_name: "openai", api_key_preview: "***9999" } };

    expect(condenseIntegrationResponse(json)).toEqual({ service_type: "llm", service_name: "openai", api_key_last4: "9999" });
  });

  it("never reads a plaintext key, even if one arrives", () => {
    const json = { success: true, data: { service_type: "llm", service_name: "openai", api_key: "sk-live-abcdef1234" } };

    expect(JSON.stringify(condenseIntegrationResponse(json))).not.toContain("1234");
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
