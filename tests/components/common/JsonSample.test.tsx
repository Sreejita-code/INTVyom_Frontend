import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JsonSample } from "@/components/common/JsonSample";

describe("JsonSample", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the title, the note and the formatted JSON", () => {
    render(<JsonSample title="See what we POST" value={{ plan: "Enterprise" }} note="Sent once per call." />);

    expect(screen.getByText("See what we POST")).toBeInTheDocument();
    expect(screen.getByText("Sent once per call.")).toBeInTheDocument();
    expect(screen.getByText(/"plan": "Enterprise"/)).toBeInTheDocument();
  });

  it("copies the stringified value", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      configurable: true,
      value: { writeText },
    });

    render(<JsonSample title="Sample" value={{ a: 1 }} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith(JSON.stringify({ a: 1 }, null, 2));
    // Awaiting the confirmation settles the state update the click kicked off, instead of leaving
    // it to land after the test and warn about an update outside `act`.
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("stays collapsed unless asked to open", () => {
    const { container, rerender } = render(<JsonSample title="Sample" value={{}} />);
    expect(container.querySelector("details")).not.toHaveAttribute("open");

    rerender(<JsonSample title="Sample" value={{}} defaultOpen />);
    expect(container.querySelector("details")).toHaveAttribute("open");
  });
});
