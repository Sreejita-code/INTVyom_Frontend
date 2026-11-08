export type TtsProvider = "cartesia" | "sarvam" | "elevenlabs" | "mistral";

export type TtsResponseFormat = "audio" | "json";

export interface TtsRequest {
  text: string;
  provider?: TtsProvider;
  model?: string;
  voice?: string;
  language?: string;
  saveToLibrary: boolean;
  responseFormat: TtsResponseFormat;
  assistantId?: string;
}

export interface TtsUsage {
  charactersCount: number | null;
  audioDurationSeconds: number | null;
  estimatedCostUsd: number | null;
  pricingComplete: boolean;
}

export interface TtsResult {
  audio: Blob;
  mediaType: string;
  provider: string;
  model: string | null;
  /** `null` when the response carried no readable usage (the `audio` format without exposed headers). */
  usage: TtsUsage | null;
}
