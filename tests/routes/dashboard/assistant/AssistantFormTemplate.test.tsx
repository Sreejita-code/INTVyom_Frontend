import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AssistantForm } from "@/routes/dashboard/assistant/AssistantForm";
import { emptyForm } from "@/routes/dashboard/assistant/constants";
import { AssistantDetail } from "@/types/assistant";

vi.mock("@/services/assistant/assistantService", () => ({
  callListTemplatesEndpoint: async () => [{ id: "pipeline-basic", name: "Basic Pipeline Assistant", description: "d" }],
  callGetTemplateEndpoint: async () => ({ assistant_mode: "pipeline", assistant_tts_model: "cartesia" }),
}));

describe("AssistantForm templates", () => {
  it("applies a template without losing what the user already entered", async () => {
    const typed: AssistantDetail = {
      ...emptyForm,
      assistant_name: "Renewals",
      assistant_prompt: "You are helpful.",
      assistant_end_call_url: "https://example.com/hook",
      assistant_end_call_webhook: { timeout_seconds: 45, attempts: 2 },
    };
    const setFormData = vi.fn();

    render(
      <AssistantForm
        mode="create"
        formData={typed}
        setFormData={setFormData}
        audioList={[]}
        allTools={[]}
        attachedToolIds={[]}
        selectedToolToAdd=""
        setSelectedToolToAdd={vi.fn()}
        onToggleTool={vi.fn()}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: /basic pipeline assistant/i }));

    await waitFor(() => expect(setFormData).toHaveBeenCalled());
    const next = setFormData.mock.calls[0][0](typed) as AssistantDetail;
    expect(next.assistant_mode).toBe("pipeline");
    expect(next).toMatchObject({
      assistant_name: "Renewals",
      assistant_prompt: "You are helpful.",
      assistant_end_call_url: "https://example.com/hook",
      assistant_end_call_webhook: { timeout_seconds: 45, attempts: 2 },
    });
  });
});
