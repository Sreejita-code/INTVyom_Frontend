export type SttProvider = "sarvam" | "cartesia" | "deepgram" | "openai" | "elevenlabs";

export interface SttRequest {
  file: File;
  provider?: SttProvider;
  model?: string;
  language?: string;
  assistantId?: string;
}

export interface SttUsage {
  audioDurationSeconds: number | null;
  estimatedCostUsd: number | null;
  pricingComplete: boolean;
}

export interface SttResult {
  text: string;
  language: string | null;
  durationSeconds: number | null;
  provider: string;
  model: string | null;
  usage: SttUsage;
}
