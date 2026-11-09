import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import DashboardLayout from "@/routes/dashboard/DashboardLayout";

vi.mock("@/routes/dashboard/CommandPalette", () => ({
  CommandPalette: () => null,
}));
vi.mock("@/routes/dashboard/DashboardSidebar", () => ({
  DashboardSidebar: () => <div>Navigation</div>,
}));
vi.mock("@/hooks/usePersistedFlag", () => ({
  usePersistedFlag: () => [false, vi.fn()],
}));

describe("DashboardLayout", () => {
  it("gives long dashboard pages their own vertical scroll container (AC-21)", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/test"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="test" element={<div>Long page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("main").lastElementChild).toHaveClass(
      "overflow-y-auto",
    );
    expect(screen.getByRole("complementary")).toHaveClass("overflow-hidden");
    expect(screen.getByRole("main").parentElement).toHaveClass(
      "fixed",
      "inset-0",
    );
  });

  it("returns the content pane to the top when the dashboard route changes", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/one"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="one" element={<Link to="../two">Next page</Link>} />
            <Route path="two" element={<div>Second page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const contentPane = screen.getByRole("main").lastElementChild as HTMLElement;
    contentPane.scrollTop = 240;

    fireEvent.click(screen.getByRole("link", { name: "Next page" }));

    await waitFor(() => expect(contentPane.scrollTop).toBe(0));
  });
});
