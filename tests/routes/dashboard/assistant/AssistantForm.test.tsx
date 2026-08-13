import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AssistantForm } from "@/routes/dashboard/assistant/AssistantForm";
import { applyModeChange } from "@/routes/dashboard/assistant/assistantConfig";
import { emptyForm } from "@/routes/dashboard/assistant/constants";
import { sttOptionsFor } from "@/routes/dashboard/assistant/providerCatalog";
import { AssistantDetail } from "@/types/assistant";

const renderForm = (overrides: Partial<AssistantDetail> = {}) =>
  render(
    <AssistantForm
      mode="edit"
      formData={{ ...emptyForm, ...overrides }}
      setFormData={vi.fn()}
      audioList={[]}
      allTools={[]}
      attachedToolIds={[]}
      selectedToolToAdd=""
      setSelectedToolToAdd={vi.fn()}
      onToggleTool={vi.fn()}
    />,
  );

/** The stage panel that owns a heading, so a query can be scoped to one stage. */
const stage = (heading: string) =>
  within(screen.getByRole("heading", { name: heading }).closest("section") as HTMLElement);

/**
 * These assertions changed deliberately when the editor stopped drawing every stage in every mode.
 *
 * The old contract rendered all three stages always and disabled the ones the mode does not run. It
 * was replaced because a locked box still teaches that the stage is part of the chain, and for two
 * of the three modes that is false: realtime has no separate transcriber or voice at all, and
 * pipeline's transcriber is a parallel tap rather than a stage in front of the model. The stages a
 * mode does not run are now absent, and the tap is drawn hanging off the model.
 */
describe("AssistantForm stage composition", () => {
  it("draws only the model in realtime mode", () => {
    renderForm({ assistant_mode: "realtime" });

    expect(screen.getByRole("heading", { name: "Realtime model" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Speech to text" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Transcript tap" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Voice" })).not.toBeInTheDocument();
  });

  it("draws all three stages, live, in cascade mode", () => {
    renderForm({ assistant_mode: "cascade" });

    for (const heading of ["Speech to text", "Text model", "Voice"]) {
      expect(stage(heading).getByRole("combobox", { name: "Provider" })).toBeEnabled();
    }
  });

  it("draws the pipeline transcriber as a tap, not as a stage before the model", () => {
    renderForm({ assistant_mode: "pipeline" });

    expect(screen.getByRole("heading", { name: "Realtime model" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Voice" })).toBeInTheDocument();
    // Named "Transcript tap" rather than "Speech to text": it does not change what the model hears.
    expect(stage("Transcript tap").getByRole("combobox", { name: "Provider" })).toBeEnabled();
  });

  /**
   * Pipeline only ever runs `sarvam` or `native`. The API accepts the other four and then replaces
   * them with native transcription at call time, so offering them here was offering a choice that
   * does not take effect — the picker now stops at the two that do.
   */
  it("offers only the transcribers pipeline actually runs", () => {
    renderForm({ assistant_mode: "pipeline" });
    expect(sttOptionsFor("pipeline").map((p) => p.value)).toEqual(["sarvam", "native"]);
  });

  it("still offers every transcriber in cascade, where they all run", () => {
    expect(sttOptionsFor("cascade").map((p) => p.value)).toEqual([
      "sarvam",
      "cartesia",
      "deepgram",
      "elevenlabs",
      "openai",
    ]);
  });

  /**
   * A stored value the mode no longer offers is kept in the list rather than dropped. Radix renders
   * an empty trigger when its value is absent from its items, which reads as data loss, and a user
   * cannot repair a combination the form refuses to show them. So an assistant saved with Deepgram
   * in pipeline keeps it, visible and editable, with a sentence saying what it is doing instead.
   */
  it("keeps a stored cascade-only transcriber visible and editable in pipeline", () => {
    renderForm({ assistant_mode: "pipeline", assistant_stt_model: "deepgram" });

    const panel = stage("Transcript tap");
    expect(panel.getByText(/only runs in cascade mode/i)).toBeInTheDocument();
    expect(panel.getByRole("combobox", { name: "Provider" })).toBeEnabled();
    expect(sttOptionsFor("pipeline", "deepgram").map((p) => p.value)).toContain("deepgram");
  });

  /**
   * Both collapse to native transcription in pipeline mode, but only one of them costs you
   * anything. Upstream's compatibility matrix logs a warning for cartesia/deepgram/elevenlabs and
   * stays silent for openai, because in pipeline the realtime model already transcribes with the
   * same vendor and the same model. Telling someone to switch modes to "fix" the openai case would
   * be advice to change modes for no benefit, so the two must not share a message.
   */
  it("does not tell you to switch modes for a stored OpenAI transcriber in pipeline", () => {
    renderForm({ assistant_mode: "pipeline", assistant_stt_model: "openai" });

    const panel = stage("Transcript tap");
    expect(panel.queryByText(/only runs in cascade mode/i)).not.toBeInTheDocument();
    expect(panel.getByText(/nothing is lost and nothing extra is billed/i)).toBeInTheDocument();
  });

  it("says nothing about degrading when the transcriber genuinely runs", () => {
    renderForm({ assistant_mode: "pipeline", assistant_stt_model: "sarvam" });

    const panel = stage("Transcript tap");
    expect(panel.queryByText(/only runs in cascade mode/i)).not.toBeInTheDocument();
    expect(panel.queryByText(/nothing is lost/i)).not.toBeInTheDocument();
  });

  /**
   * Switching *into* pipeline is a deliberate act, so an unrunnable transcriber is repaired rather
   * than carried through — the legacy path above is only for values that were already stored.
   */
  it("repairs a cascade-only transcriber when the user switches into pipeline", () => {
    const next = applyModeChange(
      { ...emptyForm, assistant_mode: "cascade", assistant_stt_model: "deepgram" },
      "pipeline",
    );
    expect(next.assistant_stt_model).toBe("sarvam");
  });

  it("disables whichever generation knob this model family throws away", () => {
    // gpt-4.1 does not reason, so reasoning effort is dead and temperature is live.
    renderForm({ assistant_mode: "cascade", assistant_llm_config: { provider: "openai", model: "gpt-4.1" } });
    expect(stage("Text model").getByRole("combobox", { name: "Reasoning effort" })).toBeDisabled();
  });

  it("flips that gating for a reasoning model", () => {
    renderForm({ assistant_mode: "cascade", assistant_llm_config: { provider: "openai", model: "gpt-5-mini" } });

    const panel = stage("Text model");
    expect(panel.getByRole("combobox", { name: "Reasoning effort" })).toBeEnabled();
    expect(panel.getByText(/is a reasoning model and rejects temperature/i)).toBeInTheDocument();
  });

  it("treats a *-chat-latest alias as the chat model it is", () => {
    // Starts with "gpt-5" but tracks a chat snapshot: temperature is the live knob here, and the
    // `/^gpt-5/` test this replaced greyed out the only one it reads.
    renderForm({ assistant_mode: "cascade", assistant_llm_config: { provider: "openai", model: "gpt-5.2-chat-latest" } });

    const panel = stage("Text model");
    expect(panel.getByRole("combobox", { name: "Reasoning effort" })).toBeDisabled();
    expect(panel.getByText(/is a chat model and rejects reasoning effort/i)).toBeInTheDocument();
  });
});

describe("AssistantForm prompt variables", () => {
  it("lists the placeholders the prompt asks the call to fill", () => {
    renderForm({
      assistant_prompt: "You are {{agent.name}}. The caller is {{customer_name}} on {{call.caller_number}}.",
    });

    expect(screen.getByText("{{agent.name}}")).toBeInTheDocument();
    expect(screen.getByText("{{customer_name}}")).toBeInTheDocument();
    // Platform-supplied, so it is never something the user has to fill in.
    expect(screen.queryByText("{{call.caller_number}}")).not.toBeInTheDocument();
  });
});
