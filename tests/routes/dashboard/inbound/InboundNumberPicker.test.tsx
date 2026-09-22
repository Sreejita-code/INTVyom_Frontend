import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { InboundNumberPicker } from "@/routes/dashboard/inbound/InboundNumberPicker";

const field = () => screen.getByRole("combobox", { name: /exotel number/i });

describe("InboundNumberPicker", () => {
  it("suggests the numbers the API returned for a trunk", () => {
    render(
      <InboundNumberPicker
        numbers={[{ trunk_id: "t1", number: "+918044319240", name: "Main line" }]}
        value=""
        onChange={vi.fn()}
      />,
    );

    const options = document.getElementById(field().getAttribute("list") ?? "")?.querySelectorAll("option") ?? [];
    expect([...options].map((o) => (o as HTMLOptionElement).value)).toEqual(["+918044319240"]);
  });

  it("lets the user type a number when the trunk list carries none", () => {
    const onChange = vi.fn();
    render(<InboundNumberPicker numbers={[]} value="" onChange={onChange} />);

    fireEvent.change(field(), { target: { value: "+91 80443 19240" } });

    expect(onChange).toHaveBeenCalledWith("+91 80443 19240");
  });

  it("flags text that is not a phone number", () => {
    render(<InboundNumberPicker numbers={[]} value="main line" onChange={vi.fn()} />);

    expect(field()).toHaveAttribute("aria-invalid", "true");
  });

  it("can be typed into inside the assign dialog", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Assign</DialogTitle>
          <InboundNumberPicker numbers={[]} value="" onChange={vi.fn()} />
        </DialogContent>
      </Dialog>,
    );

    field().focus();

    expect(field()).toHaveFocus();
  });
});
