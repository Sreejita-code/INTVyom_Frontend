import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callCallRecordsEndpoint,
  condenseCallRecordsResponse,
} from "@/services/passthroughCall/passthroughCallService";

describe("passthrough call records", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { records: [], pagination: {} } }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const queryOf = () => new URL(String(fetchMock.mock.calls[0][0])).searchParams;

  it("asks for a page, not an offset", async () => {
    await callCallRecordsEndpoint({ page: 3, limit: 10 });

    expect(queryOf().get("page")).toBe("3");
    expect(queryOf().get("limit")).toBe("10");
    expect(queryOf().has("offset")).toBe(false);
    expect(queryOf().has("user_id")).toBe(false);
  });

  it("sends only the filters that are set", async () => {
    await callCallRecordsEndpoint({
      page: 1,
      limit: 10,
      toNumber: "+919999999999",
      callStatus: "completed",
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: new Date("2026-09-22T23:59:59.999Z"),
    });

    expect(queryOf().get("to_number")).toBe("+919999999999");
    expect(queryOf().get("call_status")).toBe("completed");
    expect(queryOf().get("start_date")).toBe("2026-09-01T00:00:00.000Z");
    expect(queryOf().get("end_date")).toBe("2026-09-22T23:59:59.999Z");
  });

  it("condenses records and the total from the paginated envelope", () => {
    const json = {
      success: true,
      data: { records: [{ id: "r1" }], pagination: { total: 42, page: 2, limit: 10, total_pages: 5 } },
    };

    expect(condenseCallRecordsResponse(json)).toEqual({ records: [{ id: "r1" }], total: 42 });
  });
});
