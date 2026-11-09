import {
  SARVAM_DEFAULT_TTS_MODEL,
  SARVAM_TTS_LIMITS,
  TTS_PROVIDERS,
  findProvider,
  sarvamTtsModelOf,
} from "@/routes/dashboard/assistant/providerCatalog";
import type { TtsProvider } from "@/types/tts";
import type { TtsFormValues } from "./TtsForm";

export const MAX_TTS_CHARACTERS = 5000;

export const ttsBlockReason = (text: string): string | null => {
  const length = text.trim().length;
  if (length === 0) return "Enter some text to speak.";
  if (text.length > MAX_TTS_CHARACTERS)
    return `Use ${MAX_TTS_CHARACTERS} characters or fewer.`;
  return null;
};

export const EMPTY_TTS_VALUES: TtsFormValues = {
  text: "",
  provider: "",
  model: "",
  voice: "",
  language: "",
  saveToLibrary: false,
  format: "audio",
  assistantId: "",
  providerKey: "",
};

/** Catalogue option values for one provider field; any manually typed value is still sent. */
export const ttsFieldOptions = (
  provider: TtsProvider | "",
  key: string,
): string[] =>
  findProvider(TTS_PROVIDERS, provider || "cartesia")
    ?.fields.find((field) => field.key === key)
    ?.options?.map((o) => o.value) ?? [];

export const ttsModelOptions = (provider: TtsProvider | ""): string[] => {
  const spec = findProvider(TTS_PROVIDERS, provider || "cartesia");
  if (!spec) return [];
  if (spec.fields.some((field) => field.key === "model")) {
    return (
      spec.fields
        .find((field) => field.key === "model")
        ?.options?.map((o) => o.value) ?? []
    );
  }
  // The synthesis model is pinned by the platform (Cartesia sonic-3, Mistral voxtral), so there is
  // no model field to read.
  if (spec.value === "cartesia") return ["sonic-3"];
  if (spec.value === "mistral") return ["voxtral-mini-tts-2603"];
  return ttsFieldOptions(provider, "voice");
};

/** Voice and language suggestions: the Sarvam speaker + language rosters, or the provider's language list. */
export const ttsVoiceOptions = (
  provider: TtsProvider | "",
  model: string,
): string[] => {
  if (provider === "sarvam") {
    return (
      SARVAM_TTS_LIMITS[
        sarvamTtsModelOf({ model: model || SARVAM_DEFAULT_TTS_MODEL })
      ].speakers as readonly string[]
    ).slice();
  }
  return [];
};

export const ttsLanguageOptions = (
  provider: TtsProvider | "",
  model: string,
): string[] => {
  if (provider === "sarvam") {
    return (
      SARVAM_TTS_LIMITS[
        sarvamTtsModelOf({ model: model || SARVAM_DEFAULT_TTS_MODEL })
      ].languages as readonly string[]
    ).slice();
  }
  return ttsFieldOptions(provider, "language");
};
