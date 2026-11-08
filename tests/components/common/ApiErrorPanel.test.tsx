import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApiErrorPanel } from "@/components/common/ApiErrorPanel";

describe("ApiErrorPanel", () => {
  it("announces the message as an alert", () => {
    render(<ApiErrorPanel error={{ status: 404, message: "Assistant not found", suggestions: {} }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Assistant not found");
  });

  it("lists each suggestion with its slot name", () => {
    render(
      <ApiErrorPanel
        error={{ status: 400, message: "bad", suggestions: { llm: "Try: openai", llm_notes: "Gemini is not supported" } }}
      />,
    );
    expect(screen.getByText("Try: openai")).toBeInTheDocument();
    expect(screen.getByText("Gemini is not supported")).toBeInTheDocument();
  });

  it("explains what to do for a known status", () => {
    render(<ApiErrorPanel error={{ status: 413, message: "too large", suggestions: {} }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("25 MB");
  });

  it("says a network failure has no status", () => {
    render(<ApiErrorPanel error={{ status: 0, message: "Network error", suggestions: {} }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Check your connection");
  });
});
