import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildAnalyticsQueryParams } from "@/services/analytics/analyticsService";
import {
  buildAssistantCallLogsQuery,
  callDeleteAssistantEndpoint,
  callGetAssistantDetailsEndpoint,
  callListAssistantsEndpoint,
} from "@/services/assistant/assistantService";
import { callDeleteAudioEndpoint, callListAudiosEndpoint } from "@/services/audio/audioService";
import { callQueueStatusEndpoint } from "@/services/call/callService";
import {
  callDetachInboundEndpoint,
  callDeleteInboundMappingEndpoint,
  callListInboundMappingsEndpoint,
} from "@/services/inbound/inboundService";
import { callDeleteStrategyEndpoint, callListStrategiesEndpoint } from "@/services/inboundContext/inboundContextService";
import { callGetIntegrationEndpoint, callResyncStatusEndpoint } from "@/services/integration/integrationService";
import {
  callDeleteTrunkEndpoint,
  callGetTrunkDetailsEndpoint,
  callListTrunksEndpoint,
} from "@/services/sip/sipService";
import {
  callDeleteToolEndpoint,
  callGetToolDetailsEndpoint,
  callListToolsEndpoint,
  callToggleToolAttachmentEndpoint,
} from "@/services/tool/toolService";
import { callGetWebCallTokenEndpoint } from "@/services/webCall/webCallService";

/**
 * The backend identifies the caller by the bearer key and ignores `user_id`, so no request
 * should carry one — in the query string or in the body.
 */
describe("requests identify the caller by bearer key only", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => Response.json({ success: true, data: { token: "t" } }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const sent = () =>
    fetchMock.mock.calls.map(([url, init]) => `${String(url)} ${String((init as RequestInit | undefined)?.body ?? "")}`);

  it("sends no user_id from any service", async () => {
    await callListAssistantsEndpoint({ page: 1, limit: 10 });
    await callGetAssistantDetailsEndpoint({ assistantId: "a1" });
    await callDeleteAssistantEndpoint({ assistantId: "a1" });
    await callListAudiosEndpoint({ page: 1, limit: 50 });
    await callDeleteAudioEndpoint({ audioId: "au1" });
    await callQueueStatusEndpoint("q1");
    await callListInboundMappingsEndpoint();
    await callDetachInboundEndpoint({ inboundId: "i1" });
    await callDeleteInboundMappingEndpoint({ inboundId: "i1" });
    await callListStrategiesEndpoint();
    await callDeleteStrategyEndpoint({ strategyId: "s1" });
    await callGetIntegrationEndpoint({ serviceName: "openai" });
    await callResyncStatusEndpoint({ serviceName: "openai" });
    await callListTrunksEndpoint();
    await callGetTrunkDetailsEndpoint({ trunkId: "t1" });
    await callDeleteTrunkEndpoint({ trunkId: "t1" });
    await callListToolsEndpoint();
    await callGetToolDetailsEndpoint({ toolId: "tool1" });
    await callDeleteToolEndpoint({ toolId: "tool1" });
    await callToggleToolAttachmentEndpoint({ assistantId: "a1", toolIds: ["tool1"], attach: true });
    await callGetWebCallTokenEndpoint({ assistantId: "a1" });

    expect(fetchMock).toHaveBeenCalledTimes(21);
    for (const request of sent()) expect(request).not.toMatch(/user_id/);
  });

  it("builds query strings without user_id", () => {
    const analytics = buildAnalyticsQueryParams({
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: new Date("2026-09-22T00:00:00.000Z"),
      granularity: "day",
    });
    const callLogs = buildAssistantCallLogsQuery({
      assistantId: "a1",
      page: 1,
      limit: 10,
      sortBy: "started_at",
      sortOrder: "desc",
    });

    expect(analytics.has("user_id")).toBe(false);
    expect(callLogs).not.toHaveProperty("user_id");
  });

  it("deletes a trunk without a request body", async () => {
    await callDeleteTrunkEndpoint({ trunkId: "t1" });

    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeUndefined();
  });
});

describe("assistant list search", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { assistants: [] } }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("passes the name filter to the backend", async () => {
    await callListAssistantsEndpoint({ page: 1, limit: 15, assistantName: "support" });

    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("assistant_name")).toBe("support");
  });
});
