import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProviderKeyField } from "@/components/common/ProviderKeyField";

describe("ProviderKeyField", () => {
  it("masks the value as a password", () => {
    render(<ProviderKeyField value="sk-test" onChange={() => {}} />);
    expect(screen.getByLabelText("Provider API key (optional)")).toHaveAttribute("type", "password");
  });

  it("reports edits through onChange", () => {
    const onChange = vi.fn();
    render(<ProviderKeyField value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Provider API key (optional)"), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith("abc");
  });

  it("never writes to browser storage", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    render(<ProviderKeyField value="" onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("Provider API key (optional)"), { target: { value: "abc" } });
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});
