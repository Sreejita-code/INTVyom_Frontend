import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UsageSummary } from "@/components/common/UsageSummary";

describe("UsageSummary", () => {
  it("shows a null value as not reported, never as zero", () => {
    render(<UsageSummary rows={[{ label: "Audio duration", value: null, unit: "s" }]} pricingComplete />);
    expect(screen.getByText("Audio duration").closest("div")).toHaveTextContent("Not reported");
    expect(screen.queryByText("0 s")).not.toBeInTheDocument();
  });

  it("shows numbers with their unit", () => {
    render(<UsageSummary rows={[{ label: "Total tokens", value: 40 }]} pricingComplete />);
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("says the cost is partial when pricing is incomplete", () => {
    render(<UsageSummary rows={[]} pricingComplete={false} />);
    expect(screen.getByText(/Cost is partial/)).toBeInTheDocument();
  });
});
