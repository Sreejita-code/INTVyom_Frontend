import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WizardProgress } from "@/routes/dashboard/assistant/WizardProgress";

const listSteps = vi.fn();
const status = vi.fn();
const getStep = vi.fn();
const navigation = vi.fn();
const validateStep = vi.fn();

vi.mock("@/services/assistant/assistantService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/assistant/assistantService")>()),
  callListWizardStepsEndpoint: (draft: unknown) => listSteps(draft),
  callWizardStatusEndpoint: (draft: unknown) => status(draft),
  callGetWizardStepEndpoint: (id: string, draft: unknown) => getStep(id, draft),
  callWizardNavigationEndpoint: (id: string, draft: unknown) => navigation(id, draft),
  callValidateWizardStepEndpoint: (id: string, args: unknown) => validateStep(id, args),
}));

const step = (id: string, title: string, fields: string[] = []) => ({ id, title, description: `${title} description`, fields });

describe("WizardProgress", () => {
  beforeEach(() => {
    for (const fn of [listSteps, status, getStep, navigation, validateStep]) fn.mockReset();
    listSteps.mockResolvedValue({ data: [step("mode", "Choose Mode", ["assistant_mode"]), step("llm", "Configure Language Model", ["assistant_llm_config"])] });
    status.mockResolvedValue({ data: { mode: true, llm: false } });
    getStep.mockImplementation(async (id: string) => ({
      data: { ...step(id, id), validation_rules: { provider: { required: true, allowed_values: ["openai"] } }, suggestions: { providers: [{ value: "openai", label: "OpenAI", description: "" }] } },
    }));
    navigation.mockResolvedValue({ data: { next: null, previous: step("mode", "Choose Mode") } });
    validateStep.mockResolvedValue({ data: { isValid: false, errors: ["provider is required"] } });
  });

  const draft = { assistant_mode: "duplex", assistant_llm_config: { provider: "openai" } };

  it("shows how many steps the backend counts as complete and opens on the first one still to do", async () => {
    render(<WizardProgress draft={draft} />);

    expect(await screen.findByText("1 of 2 steps complete")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Configure Language Model/ })).toHaveAttribute("aria-current", "step");
    expect(await screen.findByText(/one of openai/)).toBeInTheDocument();
    expect(listSteps).toHaveBeenCalledWith(draft);
    expect(navigation).toHaveBeenCalledWith("llm", draft);
  });

  it("checks just the active step's fields against the whole draft", async () => {
    render(<WizardProgress draft={draft} />);

    fireEvent.click(await screen.findByRole("button", { name: "Check this step" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("provider is required");
    expect(validateStep).toHaveBeenCalledWith("llm", {
      stepData: { assistant_llm_config: { provider: "openai" } },
      currentConfig: draft,
    });
  });

  it("moves to the neighbouring step the backend names", async () => {
    render(<WizardProgress draft={draft} />);

    fireEvent.click(within(await screen.findByRole("list", { name: "Builder steps" })).getByRole("button", { name: /Choose Mode/ }));

    await waitFor(() => expect(getStep).toHaveBeenCalledWith("mode", draft));
  });

  it("is not drawn at all when the helper endpoints fail", async () => {
    listSteps.mockRejectedValue(new Error("down"));

    const { container } = render(<WizardProgress draft={draft} />);

    await waitFor(() => expect(listSteps).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
