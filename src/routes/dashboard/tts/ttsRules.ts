import type { TtsFormValues } from "./TtsForm";

export const MAX_TTS_CHARACTERS = 5000;

export const ttsBlockReason = (text: string): string | null => {
  const length = text.trim().length;
  if (length === 0) return "Enter some text to speak.";
  if (text.length > MAX_TTS_CHARACTERS) return `Use ${MAX_TTS_CHARACTERS} characters or fewer.`;
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
