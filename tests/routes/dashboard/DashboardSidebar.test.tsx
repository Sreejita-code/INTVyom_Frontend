import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardSidebar } from "@/routes/dashboard/DashboardSidebar";

const renderSidebar = (props: Partial<React.ComponentProps<typeof DashboardSidebar>> = {}) =>
  render(
    <MemoryRouter initialEntries={["/dashboard/assistant"]}>
      <TooltipProvider>
        <DashboardSidebar onSearch={() => {}} {...props} />
      </TooltipProvider>
    </MemoryRouter>,
  );

describe("DashboardSidebar", () => {
  it("labels every page without spelling out its description", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: "Assistants" })).toBeInTheDocument();
    expect(screen.queryByText("Create and edit your voice assistants")).not.toBeInTheDocument();
  });

  it("marks the page you are on as current", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: "Assistants" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tools" })).not.toHaveAttribute("aria-current");
  });

  it("filters the list down as you type", () => {
    renderSidebar();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "phone" } });

    expect(screen.getByRole("link", { name: "Phone Numbers" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Audio Library" })).not.toBeInTheDocument();
  });

  it("matches a page by its keywords, not only its label", () => {
    renderSidebar();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "elevenlabs" } });

    expect(screen.getByRole("link", { name: "Provider Keys" })).toBeInTheDocument();
  });

  it("keeps every page reachable and named when collapsed to the rail", () => {
    renderSidebar({ collapsed: true });

    expect(screen.getByRole("link", { name: "Assistants" })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("reports its collapsed state on the toggle and calls back when used", () => {
    const onToggleCollapsed = vi.fn();
    renderSidebar({ collapsed: true, onToggleCollapsed });

    const toggle = screen.getByRole("button", { name: /expand sidebar/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(onToggleCollapsed).toHaveBeenCalledOnce();
  });

  it("hands the typed query to the full search on Enter", () => {
    const onSearch = vi.fn();
    renderSidebar({ onSearch });

    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "billing" } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onSearch).toHaveBeenCalledWith("billing");
  });
});
