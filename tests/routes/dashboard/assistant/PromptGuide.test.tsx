import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PromptEditor } from "@/routes/dashboard/assistant/PromptEditor";

describe("PromptGuide", () => {
  const renderEditor = () =>
    render(<PromptEditor prompt="Hello" startInstruction="" onPromptChange={() => {}} onStartInstructionChange={() => {}} />);

  it("sits beside the system prompt and opens the tips", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Prompt tips" }));

    expect(screen.getByText("Mix XML and Markdown")).toBeInTheDocument();
    expect(screen.getByText("Keep it short")).toBeInTheDocument();
    expect(screen.getByText("Say each thing once")).toBeInTheDocument();
    expect(screen.getByText(/<role>/)).toBeInTheDocument();
  });

  it("never changes the prompt", () => {
    const calls: string[] = [];
    render(<PromptEditor prompt="Hello" startInstruction="" onPromptChange={(v) => calls.push(v)} onStartInstructionChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Prompt tips" }));

    expect(calls).toEqual([]);
    expect(screen.getByLabelText(/System prompt/)).toHaveValue("Hello");
  });
});
