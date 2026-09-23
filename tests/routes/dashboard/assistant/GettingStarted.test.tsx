import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GettingStarted } from "@/routes/dashboard/assistant/GettingStarted";

describe("GettingStarted", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders all five steps with links to the right pages", () => {
    render(
      <MemoryRouter>
        <GettingStarted />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Get started in 5 steps" })).toBeInTheDocument();
    expect(screen.getByText("Create an assistant")).toBeInTheDocument();
    expect(screen.getByText("Add a phone number")).toBeInTheDocument();
    expect(screen.getByText("Route the number to your assistant")).toBeInTheDocument();
    expect(screen.getByText("Make a test call")).toBeInTheDocument();
    expect(screen.getByText("Read the call logs")).toBeInTheDocument();
  });

  it("dismisses and stays dismissed", () => {
    render(
      <MemoryRouter>
        <GettingStarted />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss getting started guide" }));
    expect(screen.queryByRole("heading", { name: "Get started in 5 steps" })).not.toBeInTheDocument();
    expect(localStorage.getItem("intvoicekit_onboarding_dismissed")).toBe("1");
  });
});
