import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BillableMinutesLookup } from "@/routes/dashboard/assistant/BillableMinutesLookup";

const lookup = vi.fn();
vi.mock("@/services/assistant/assistantService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/assistant/assistantService")>()),
  callAssistantBillableMinutesEndpoint: (args: unknown) => lookup(args),
}));

describe("BillableMinutesLookup", () => {
  it("shows the billable minutes for one number", async () => {
    lookup.mockResolvedValue({ data: { total_billable_minutes: 12.5 } });

    render(<BillableMinutesLookup assistantId="a1" />);
    fireEvent.change(screen.getByRole("textbox", { name: /phone number/i }), { target: { value: "+919999999999" } });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("12.5 billable minutes");
    expect(lookup).toHaveBeenCalledWith({ assistantId: "a1", toNumber: "+919999999999" });
  });

  it("shows the backend's error", async () => {
    lookup.mockRejectedValue(new Error("Assistant not found"));

    render(<BillableMinutesLookup assistantId="a1" />);
    fireEvent.change(screen.getByRole("textbox", { name: /phone number/i }), { target: { value: "+919999999999" } });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Assistant not found");
  });
});
