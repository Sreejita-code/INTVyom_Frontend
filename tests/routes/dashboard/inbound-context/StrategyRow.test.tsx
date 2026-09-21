import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StrategyRow } from "@/routes/dashboard/inbound-context/StrategyRow";
import type { StrategyItem } from "@/types/inboundContext";

const strategy: StrategyItem = {
  strategy_id: "str_1",
  name: "UAT HR Incoming strategy",
  type: "webhook",
  strategy_config: {
    url: "https://hirebot-api.indusnettechnologies.com/api/v1/candidate/context?tenant=uat",
  },
};

describe("StrategyRow", () => {
  it("shows the host rather than the whole endpoint", () => {
    render(<StrategyRow strategy={strategy} selected={false} onSelect={() => {}} />);

    expect(screen.getByText("UAT HR Incoming strategy")).toBeInTheDocument();
    expect(screen.getByText("hirebot-api.indusnettechnologies.com")).toBeInTheDocument();
    expect(screen.queryByText(/candidate\/context/)).not.toBeInTheDocument();
  });

  it("keeps the full endpoint reachable on hover", () => {
    render(<StrategyRow strategy={strategy} selected={false} onSelect={() => {}} />);

    expect(screen.getByRole("button")).toHaveAttribute("title", strategy.strategy_config.url);
  });

  it("says so when a strategy has no endpoint yet", () => {
    render(
      <StrategyRow
        strategy={{ ...strategy, strategy_config: { url: "" } }}
        selected={false}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText("No endpoint set")).toBeInTheDocument();
  });

  it("announces the selected row and reports clicks", () => {
    const onSelect = vi.fn();
    render(<StrategyRow strategy={strategy} selected onSelect={onSelect} />);

    const row = screen.getByRole("button");
    expect(row).toHaveAttribute("aria-current", "true");

    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
