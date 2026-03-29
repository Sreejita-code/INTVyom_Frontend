import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AnalyticsPage from "@/pages/Analytics";

const mockToast = vi.fn();

const mockAnalytics = {
  getDashboardMetrics: vi.fn(),
  getCallsByAssistant: vi.fn(),
  getCallsByPhoneNumber: vi.fn(),
  getCallsByTime: vi.fn(),
  getCallsByService: vi.fn(),
};

vi.mock("@/lib/auth", () => ({
  getStoredUser: () => ({ user_id: "user-1", user_name: "Demo User" }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/analytics", () => ({
  getDefaultAnalyticsDateRange: () => ({
    startDate: new Date("2026-02-27T00:00:00.000Z"),
    endDate: new Date("2026-03-29T12:00:00.000Z"),
  }),
  getDashboardMetrics: (...args: unknown[]) => mockAnalytics.getDashboardMetrics(...args),
  getCallsByAssistant: (...args: unknown[]) => mockAnalytics.getCallsByAssistant(...args),
  getCallsByPhoneNumber: (...args: unknown[]) => mockAnalytics.getCallsByPhoneNumber(...args),
  getCallsByTime: (...args: unknown[]) => mockAnalytics.getCallsByTime(...args),
  getCallsByService: (...args: unknown[]) => mockAnalytics.getCallsByService(...args),
}));

describe("Analytics page", () => {
  beforeEach(() => {
    mockToast.mockReset();
    Object.values(mockAnalytics).forEach((fn) => fn.mockReset());

    mockAnalytics.getDashboardMetrics.mockResolvedValue({
      totalCalls: 512,
      totalDurationMinutes: 577.54,
      totalDurationHours: 9.63,
      avgDurationMinutes: 1.25,
      callsToday: 8,
      callsThisWeek: 212,
      callsThisMonth: 511,
    });
    mockAnalytics.getCallsByAssistant.mockResolvedValue([]);
    mockAnalytics.getCallsByPhoneNumber.mockResolvedValue([]);
    mockAnalytics.getCallsByTime.mockResolvedValue([]);
    mockAnalytics.getCallsByService.mockResolvedValue([]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      })
    );
  });

  it("renders only the four summary KPI cards", async () => {
    render(<AnalyticsPage />);

    expect(await screen.findByText("Total Calls")).toBeInTheDocument();
    expect(screen.getByText("Avg Duration")).toBeInTheDocument();
    expect(screen.getByText("Calls Today")).toBeInTheDocument();
    expect(screen.getByText("Calls This Week")).toBeInTheDocument();

    expect(screen.queryByText("Calls This Month")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Duration (Minutes)")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Duration (Hours)")).not.toBeInTheDocument();
  });

  it("shows only top 5 assistants and top 5 phone numbers", async () => {
    mockAnalytics.getCallsByAssistant.mockResolvedValue([
      { assistantName: "A1", callCount: 100 },
      { assistantName: "A2", callCount: 90 },
      { assistantName: "A3", callCount: 80 },
      { assistantName: "A4", callCount: 70 },
      { assistantName: "A5", callCount: 60 },
      { assistantName: "A6", callCount: 50 },
    ]);
    mockAnalytics.getCallsByPhoneNumber.mockResolvedValue([
      { phoneNumber: "+911000000001", callCount: 100, totalDurationMinutes: 100, avgDurationMinutes: 1 },
      { phoneNumber: "+911000000002", callCount: 90, totalDurationMinutes: 90, avgDurationMinutes: 1 },
      { phoneNumber: "+911000000003", callCount: 80, totalDurationMinutes: 80, avgDurationMinutes: 1 },
      { phoneNumber: "+911000000004", callCount: 70, totalDurationMinutes: 70, avgDurationMinutes: 1 },
      { phoneNumber: "+911000000005", callCount: 60, totalDurationMinutes: 60, avgDurationMinutes: 1 },
      { phoneNumber: "+911000000006", callCount: 50, totalDurationMinutes: 50, avgDurationMinutes: 1 },
    ]);

    render(<AnalyticsPage />);

    expect(await screen.findByText("Top Assistants")).toBeInTheDocument();
    expect(await screen.findByText("Top Phone Numbers")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("+911000000001")).toBeInTheDocument();
      expect(screen.getByText("+911000000005")).toBeInTheDocument();
      expect(screen.queryByText("+911000000006")).not.toBeInTheDocument();
    });
  });

  it("shows low-signal message instead of service chart when one service dominates", async () => {
    mockAnalytics.getCallsByService.mockResolvedValue([
      { service: "unknown", callCount: 510 },
      { service: "exotel", callCount: 2 },
    ]);

    render(<AnalyticsPage />);

    expect(await screen.findByText("Calls by Service")).toBeInTheDocument();
    expect(await screen.findByText("Service split is not meaningful for this range.")).toBeInTheDocument();
  });

  it("keeps page usable when one analytics endpoint fails", async () => {
    mockAnalytics.getCallsByAssistant.mockRejectedValueOnce(new Error("assistant fail"));
    render(<AnalyticsPage />);

    expect(await screen.findByText("Top Assistants")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });
  });

  it("refetches analytics when apply is clicked", async () => {
    render(<AnalyticsPage />);
    await screen.findByText("Top Assistants");

    const applyButton = screen.getByRole("button", { name: /apply/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockAnalytics.getDashboardMetrics).toHaveBeenCalledTimes(2);
    });
  });
});
