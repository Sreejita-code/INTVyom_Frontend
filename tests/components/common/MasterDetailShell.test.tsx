import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MasterDetailShell } from "@/components/common/MasterDetailShell";

/**
 * Both panes are always mounted; `mobileDetailOpen` only decides which one the
 * `hidden`/`flex` classes reveal below the `lg` breakpoint. jsdom has no real
 * viewport, so these assert the class toggle rather than visual layout.
 */
describe("MasterDetailShell", () => {
  it("renders both panes regardless of mobileDetailOpen", () => {
    render(<MasterDetailShell mobileDetailOpen={false} list={<p>list pane</p>} detail={<p>detail pane</p>} />);

    expect(screen.getByText("list pane")).toBeInTheDocument();
    expect(screen.getByText("detail pane")).toBeInTheDocument();
  });

  it("shows the list and hides the detail on mobile when closed", () => {
    render(<MasterDetailShell mobileDetailOpen={false} list={<p>list pane</p>} detail={<p>detail pane</p>} />);

    expect(screen.getByText("list pane").parentElement).not.toHaveClass("hidden");
    expect(screen.getByText("detail pane").parentElement).toHaveClass("hidden");
  });

  it("shows the detail and hides the list on mobile when open", () => {
    render(<MasterDetailShell mobileDetailOpen list={<p>list pane</p>} detail={<p>detail pane</p>} />);

    expect(screen.getByText("list pane").parentElement).toHaveClass("hidden");
    expect(screen.getByText("detail pane").parentElement).not.toHaveClass("hidden");
  });

  it("lets a caller override the default pane width", () => {
    render(
      <MasterDetailShell
        mobileDetailOpen={false}
        listClassName="lg:w-[350px]"
        list={<p>list pane</p>}
        detail={<p>detail pane</p>}
      />,
    );

    const listPane = screen.getByText("list pane").parentElement;
    expect(listPane).toHaveClass("lg:w-[350px]");
    expect(listPane).not.toHaveClass("lg:w-80");
  });
});

describe("MasterDetailShell collapse", () => {
  it("offers no collapse control unless a collapseKey is given", () => {
    render(<MasterDetailShell mobileDetailOpen={false} list={<p>list pane</p>} detail={<p>detail pane</p>} />);

    expect(screen.queryByRole("button", { name: /list/i })).not.toBeInTheDocument();
  });

  it("hides the list pane on desktop once collapsed, and offers a way back", () => {
    render(
      <MasterDetailShell
        mobileDetailOpen={false}
        collapseKey="test.assistants"
        list={<p>list pane</p>}
        detail={<p>detail pane</p>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse list" }));

    expect(screen.getByRole("button", { name: "Expand list" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collapse list" })).not.toBeInTheDocument();
    expect(screen.getByText("detail pane")).toBeInTheDocument();
  });

  it("remembers the collapsed pane across a remount", () => {
    const shell = (
      <MasterDetailShell
        mobileDetailOpen={false}
        collapseKey="test.remembered"
        list={<p>list pane</p>}
        detail={<p>detail pane</p>}
      />
    );

    const { unmount } = render(shell);
    fireEvent.click(screen.getByRole("button", { name: "Collapse list" }));
    unmount();

    render(shell);
    expect(screen.getByRole("button", { name: "Expand list" })).toBeInTheDocument();
  });
});
