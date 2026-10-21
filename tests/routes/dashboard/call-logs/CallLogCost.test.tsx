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

  it("labels a duplex call's voice and backend rows and flags an unpriced one", () => {
    const duplex: CallUsage = {
      estimatedCostUsd: 0.1,
      pricingComplete: false,
      usageFinalized: true,
      lines: [
        { type: "llm", role: "voice", provider: "openai", model: "gpt-live-1", estimatedCostUsd: 0.1, sessionDuration: 120 },
        { type: "llm", role: "backend", provider: "openai", model: "gpt-9", estimatedCostUsd: null, inputTokens: 1000, outputTokens: 300 },
      ],
    };
    render(<CallLogCost usage={duplex} />);
    fireEvent.click(screen.getByRole("button", { name: "$0.10" }));
    expect(screen.getByText("Voice · GPT-Live")).toBeInTheDocument();
    expect(screen.getByText("Backend model")).toBeInTheDocument();
    expect(screen.getByText("120.0s session")).toBeInTheDocument();
    expect(screen.getByText("1,000 in · 300 out")).toBeInTheDocument();
    expect(screen.getByText("No rate")).toBeInTheDocument();
    expect(screen.getByText("Pricing incomplete")).toBeInTheDocument();
  });
});
