import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssistantPicker } from "@/components/common/AssistantPicker";
import * as assistantService from "@/services/assistant/assistantService";

const renderPicker = (value = "") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AssistantPicker value={value} onChange={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("AssistantPicker", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists the user's assistants", async () => {
    vi.spyOn(assistantService, "callListAssistantsEndpoint").mockResolvedValue({
      ok: true,
      json: { data: [{ assistant_id: "a1", assistant_name: "Sales bot" }] },
    });
    renderPicker();
    expect(await screen.findByRole("combobox", { name: "Assistant (optional)" })).toBeInTheDocument();
  });

  it("explains how to create one when there are none", async () => {
    vi.spyOn(assistantService, "callListAssistantsEndpoint").mockResolvedValue({ ok: true, json: { data: [] } });
    renderPicker();
    expect(await screen.findByText(/No assistants yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/dashboard/assistant");
  });

  it("shows a load error with a retry, and the page keeps working", async () => {
    vi.spyOn(assistantService, "callListAssistantsEndpoint").mockRejectedValue(new Error("boom"));
    renderPicker();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not load assistants"));
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
