import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PlaygroundShell } from "@/components/common/PlaygroundShell";

const Probe = () => {
  const location = useLocation();
  return <div data-testid="search">{location.search}</div>;
};

const renderShell = (initial = "/dashboard/stt") =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <PlaygroundShell
        title="Speech to text"
        purpose="Turn audio into text."
        method="POST"
        path="/api/stt/transcribe"
        tabs={{
          try: <p>try panel</p>,
          code: <p>code panel</p>,
          reference: <p>reference panel</p>,
        }}
      />
      <Probe />
    </MemoryRouter>,
  );

describe("PlaygroundShell", () => {
  it("shows the endpoint and purpose in the header", () => {
    renderShell();
    expect(
      screen.getByRole("heading", { name: "Speech to text" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Turn audio into text.")).toBeInTheDocument();
    expect(screen.getByText("POST")).toBeInTheDocument();
    expect(screen.getByText("/api/stt/transcribe")).toBeInTheDocument();
  });

  it("opens the tab named in ?tab=", () => {
    renderShell("/dashboard/stt?tab=code");
    expect(screen.getByRole("tab", { name: "Code" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("code panel")).toBeVisible();
  });

  it("falls back to Try it for an unknown tab value", () => {
    renderShell("/dashboard/stt?tab=nope");
    expect(screen.getByRole("tab", { name: "Try it" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("writes the chosen tab into the URL", () => {
    renderShell();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Reference" }));
    fireEvent.click(screen.getByRole("tab", { name: "Reference" }));
    expect(screen.getByTestId("search")).toHaveTextContent("tab=reference");
  });
});
