import { describe, expect, it } from "vitest";

import {
  buildAnalyticsQueryParams,
  getDefaultAnalyticsDateRange,
  normalizeAssistantBreakdown,
  normalizeDashboardMetrics,
  normalizePhoneBreakdown,
  normalizeServiceBreakdown,
  normalizeTimeSeries,
} from "@/lib/analytics";

describe("analytics utils", () => {
  it("builds query params with required and optional values", () => {
    const query = buildAnalyticsQueryParams(
      {
        userId: "u1",
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        endDate: new Date("2026-03-31T23:59:59.000Z"),
        granularity: "day",
        assistantId: "a1",
      },
      { includeGranularity: true, includeAssistantId: true }
    );

    expect(query.get("user_id")).toBe("u1");
    expect(query.get("start_date")).toBe("2026-03-01T00:00:00.000Z");
    expect(query.get("end_date")).toBe("2026-03-31T23:59:59.000Z");
    expect(query.get("granularity")).toBe("day");
    expect(query.get("assistant_id")).toBe("a1");
  });

  it("returns default date range using last 30 days UTC boundary", () => {
    const now = new Date("2026-03-29T12:30:00.000Z");
    const { startDate, endDate } = getDefaultAnalyticsDateRange(now);

    expect(endDate.toISOString()).toBe("2026-03-29T12:30:00.000Z");
    expect(startDate.toISOString()).toBe("2026-02-27T00:00:00.000Z");
  });

  it("normalizes alternate dashboard metric keys", () => {
    const normalized = normalizeDashboardMetrics({
      data: {
        calls_total: "42",
        total_duration_minutes: "126.5",
        total_duration_hours: "2.11",
        averageCallDurationMinutes: "2.5",
        calls_today: "8",
        calls_this_week: 21,
        calls_this_month: "87",
      },
    });

    expect(normalized).toEqual({
      totalCalls: 42,
      totalDurationMinutes: 126.5,
      totalDurationHours: 2.11,
      avgDurationMinutes: 2.5,
      callsToday: 8,
      callsThisWeek: 21,
      callsThisMonth: 87,
    });
  });

  it("normalizes list payloads with alternate keys", () => {
    expect(
      normalizeAssistantBreakdown({
        data: [{ name: "Sales Bot", calls: "12", _id: "ab1" }],
      })
    ).toEqual([{ assistantId: "ab1", assistantName: "Sales Bot", callCount: 12 }]);

    expect(
      normalizePhoneBreakdown({
        data: {
          items: [{ to_number: "+123", count: "4" }],
        },
      })
    ).toEqual([
      {
        phoneNumber: "+123",
        callCount: 4,
        totalDurationMinutes: 0,
        totalDurationHours: 0,
        avgDurationMinutes: 0,
      },
    ]);

    expect(
      normalizeTimeSeries({
        data: {
          series: [{ time_bucket: "2026-03-01", total_calls: 7 }],
        },
      })
    ).toEqual([{ bucket: "2026-03-01", callCount: 7 }]);

    expect(
      normalizeServiceBreakdown({
        data: {
          breakdown: [{ provider: "livekit", calls: "9" }],
        },
      })
    ).toEqual([{ service: "livekit", callCount: 9 }]);
  });

  it("canonicalizes and merges phone number variants", () => {
    const normalized = normalizePhoneBreakdown({
      data: {
        phone_numbers: [
          { phone_number: "+91 8697421450", total_calls: 2, total_duration_minutes: 5 },
          { phone_number: "=918697421450", total_calls: 3, total_duration_minutes: 12 },
          { phone_number: "+8697421450", total_calls: 1, total_duration_minutes: 3 },
          { phone_number: "Web Call", total_calls: 2, total_duration_minutes: 6 },
          { phone_number: "Unknown | Web Call", total_calls: 4, total_duration_minutes: 10 },
        ],
      },
    });

    expect(normalized).toEqual([
      {
        phoneNumber: "+918697421450",
        callCount: 6,
        totalDurationMinutes: 20,
        totalDurationHours: 0,
        avgDurationMinutes: 20 / 6,
      },
      {
        phoneNumber: "Web Call",
        callCount: 6,
        totalDurationMinutes: 16,
        totalDurationHours: 0,
        avgDurationMinutes: 16 / 6,
      },
    ]);
  });

  it("handles null or invalid average duration values safely", () => {
    const normalized = normalizeDashboardMetrics({
      data: {
        total_calls: 1,
        avg_duration_minutes: null,
      },
    });

    expect(normalized.avgDurationMinutes).toBe(0);
  });
});
