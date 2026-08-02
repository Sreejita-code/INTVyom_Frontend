import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Bot } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

describe("EmptyState", () => {
  it("renders the title as a heading with the description", () => {
    render(<EmptyState icon={Bot} title="No Assistant Selected" description="Pick one from the sidebar." />);

    expect(screen.getByRole("heading", { name: "No Assistant Selected" })).toBeInTheDocument();
    expect(screen.getByText("Pick one from the sidebar.")).toBeInTheDocument();
  });

  it("widens the description when asked", () => {
    render(
      <EmptyState icon={Bot} title="Title" description="Wide copy." descriptionClassName="max-w-md" />,
    );

    const description = screen.getByText("Wide copy.");
    expect(description).toHaveClass("max-w-md");
    expect(description).not.toHaveClass("max-w-xs");
  });
});
