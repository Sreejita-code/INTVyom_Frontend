import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CopyIdButton } from "@/components/common/CopyIdButton";
import { Toaster } from "@/components/ui/toaster";

describe("CopyIdButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the value and copies it on click with feedback", async () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      configurable: true,
      value: { writeText },
    });

    render(
      <>
        <CopyIdButton value="abc-123" label="Assistant ID" />
        <Toaster />
      </>,
    );

    expect(screen.getByText("abc-123")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy Assistant ID" }));
    expect(writeText).toHaveBeenCalledWith("abc-123");
    expect(await screen.findByText("Assistant ID copied to clipboard.")).toBeInTheDocument();
  });
});
