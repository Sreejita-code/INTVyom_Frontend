import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CallLogCost from "@/routes/dashboard/call-logs/CallLogCost";
import { CallUsage } from "@/types/callLog";

const priced: CallUsage = {
  estimatedCostUsd: 0.014569,
  pricingComplete: true,
  usageFinalized: true,
  lines: [
    {
      type: "llm",
      provider: "openai",
      model: "gpt-5.6-luna",
      estimatedCostUsd: 0.000373,
      inputTokens: 10123,
      outputTokens: 143,
    },
    {
      type: "tts",
      provider: "sarvam",
      model: "bulbul:v3",
      estimatedCostUsd: 0.010101,
      charactersCount: 282,
    },
  ],
};

describe("CallLogCost", () => {
  it("shows a dash when usage is missing", () => {
    render(<CallLogCost usage={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens the LLM / TTS breakdown on click", () => {
    render(<CallLogCost usage={priced} />);
    fireEvent.click(screen.getByRole("button", { name: "$0.014569" }));
    expect(screen.getByText("LLM")).toBeInTheDocument();
    expect(screen.getByText("TTS")).toBeInTheDocument();
    expect(screen.getByText("openai · gpt-5.6-luna")).toBeInTheDocument();
    expect(screen.getByText("10,123 in · 143 out")).toBeInTheDocument();
    expect(screen.queryByText("Pricing incomplete")).not.toBeInTheDocument();
  });
});
