import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplatePicker } from "@/routes/dashboard/assistant/TemplatePicker";

const listTemplates = vi.fn();
const getTemplate = vi.fn();

vi.mock("@/services/assistant/assistantService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/assistant/assistantService")>()),
  callListTemplatesEndpoint: () => listTemplates(),
  callGetTemplateEndpoint: (id: string) => getTemplate(id),
}));

describe("TemplatePicker", () => {
  beforeEach(() => {
    listTemplates.mockReset();
    getTemplate.mockReset();
  });

  it("starts the new assistant from the chosen template's configuration", async () => {
    listTemplates.mockResolvedValue({
      data: [
        { id: "realtime-gemini", name: "Realtime Gemini Assistant", description: "Low latency" },
        { id: "pipeline-basic", name: "Basic Pipeline Assistant", description: "Cheapest" },
      ],
    });
    getTemplate.mockResolvedValue({ data: { configuration: { assistant_mode: "pipeline", assistant_tts_model: "sarvam" } } });
    const onApply = vi.fn();

    render(<TemplatePicker onApply={onApply} />);
    fireEvent.click(await screen.findByRole("button", { name: /basic pipeline assistant/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith({ assistant_mode: "pipeline", assistant_tts_model: "sarvam" }));
    expect(getTemplate).toHaveBeenCalledWith("pipeline-basic");
  });

  it("renders nothing when the backend offers no templates", async () => {
    listTemplates.mockRejectedValue(new Error("down"));

    const { container } = render(<TemplatePicker onApply={vi.fn()} />);

    await waitFor(() => expect(listTemplates).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
