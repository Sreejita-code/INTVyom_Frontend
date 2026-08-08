import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AssistantForm } from "@/routes/dashboard/assistant/AssistantForm";
import { applyModeChange, applySttProvider, applyTtsProvider } from "@/routes/dashboard/assistant/assistantConfig";
import { emptyForm } from "@/routes/dashboard/assistant/constants";
import { STT_PROVIDERS, TTS_PROVIDERS } from "@/routes/dashboard/assistant/providerCatalog";
import { AssistantDetail, AssistantMode, SttProvider, TtsProvider } from "@/types/assistant";

const renderForm = (formData: AssistantDetail) =>
  render(
    <AssistantForm
      mode="edit"
      formData={formData}
      setFormData={vi.fn()}
      audioList={[]}
      allTools={[]}
      attachedToolIds={[]}
      selectedToolToAdd=""
      setSelectedToolToAdd={vi.fn()}
      onToggleTool={vi.fn()}
    />,
  );

const MODES: AssistantMode[] = ["pipeline", "realtime", "cascade"];

/**
 * Every provider, in every mode, rendered at its own default config.
 *
 * This is a blunt sweep rather than a targeted assertion, and it exists because the bug it catches
 * was invisible to targeted ones. ElevenLabs STT has a `language_code` option whose real value is
 * the empty string (auto-detect). Radix reserves `""` for "no selection" and throws when a
 * `SelectItem` carries it — and because that throw happens during render, React unmounted the
 * entire editor and the page went blank the moment the provider was picked. No individual field
 * assertion would have noticed; only rendering the whole combination does.
 *
 * The other reason to sweep by `defaultConfigFor` rather than by `emptyForm`: the crash only
 * appeared once the provider's own defaults were applied, which is exactly what happens when a
 * user selects it and not what happens when a test hand-writes two fields.
 */
describe("every provider renders in every mode", () => {
  for (const mode of MODES) {
    for (const provider of STT_PROVIDERS) {
      it(`${mode} · stt · ${provider.value}`, () => {
        renderForm(applySttProvider(applyModeChange(emptyForm, mode), provider.value as SttProvider));
        expect(screen.getByRole("heading", { name: "Mode" })).toBeInTheDocument();
      });
    }

    for (const provider of TTS_PROVIDERS) {
      it(`${mode} · tts · ${provider.value}`, () => {
        renderForm(applyTtsProvider(applyModeChange(emptyForm, mode), provider.value as TtsProvider));
        expect(screen.getByRole("heading", { name: "Mode" })).toBeInTheDocument();
      });
    }
  }
});
