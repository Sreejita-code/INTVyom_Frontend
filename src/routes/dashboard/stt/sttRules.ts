import { findProvider, STT_PROVIDERS } from "@/routes/dashboard/assistant/providerCatalog";
import type { SttProvider } from "@/types/stt";
import type { SttFormValues } from "./SttForm";

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ACCEPTED = ["wav", "mp3", "ogg", "webm", "m4a"];

export const audioFileError = (file: File): string | null => {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ACCEPTED.includes(ext)) return "Choose a wav, mp3, ogg, webm or m4a file.";
  if (file.size > MAX_AUDIO_BYTES) return "This file is over the 25 MB limit.";
  return null;
};

export const EMPTY_STT_VALUES: SttFormValues = {
  file: null,
  provider: "",
  model: "",
  language: "",
  assistantId: "",
  providerKey: "",
};

/** The catalogue's option values for one provider field, shown as datalist suggestions; any typed value is still sent. */
export const sttFieldOptions = (provider: SttProvider | "", key: string): string[] =>
  findProvider(STT_PROVIDERS, provider || "sarvam")?.fields.find((field) => field.key === key)?.options?.map((o) => o.value) ?? [];

export const sttModelOptions = (provider: SttProvider | ""): string[] => sttFieldOptions(provider, "model");

/** ElevenLabs names its language field `language_code`; every others' is `language`. */
export const sttLanguageOptions = (provider: SttProvider | ""): string[] =>
  sttFieldOptions(provider, "language").length ? sttFieldOptions(provider, "language") : sttFieldOptions(provider, "language_code");
