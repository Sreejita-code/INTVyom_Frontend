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
