import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlaygroundWorkbench } from "@/components/common/PlaygroundWorkbench";

describe("PlaygroundWorkbench", () => {
  it("contains both columns on mobile and waits until xl to split them", () => {
    render(
      <PlaygroundWorkbench
        request={<div>Request</div>}
        result={<div>Result</div>}
      />,
    );

    const workbench = screen.getByTestId("playground-workbench");
    expect(workbench).toHaveClass("grid-cols-[minmax(0,1fr)]");
    expect(workbench).toHaveClass(
      "xl:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]",
    );
    expect(screen.getByText("Request").parentElement).toHaveClass("min-w-0");
    expect(screen.getByText("Result").parentElement).toHaveClass("min-w-0");
  });
});
