import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CommandPalette } from "@/routes/dashboard/CommandPalette";

describe("CommandPalette", () => {
  it("lists every dashboard page grouped by section when open", () => {
    render(
      <MemoryRouter>
        <CommandPalette open onOpenChange={() => {}} query="" onQueryChange={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Assistants")).toBeInTheDocument();
    expect(screen.getByText("Your API Keys")).toBeInTheDocument();
    expect(screen.getByText("Passthrough Calls")).toBeInTheDocument();
    expect(screen.getByText("IDs and keys guide")).toBeInTheDocument();
  });

  it("renders nothing searchable when closed", () => {
    render(
      <MemoryRouter>
        <CommandPalette open={false} onOpenChange={() => {}} query="" onQueryChange={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
