/**
 * List prices for every model the editor offers, so a model can be judged on cost at the moment
 * it is picked.
 *
 * Source: the platform's own Pricing reference (`reference/pricing.md`), a static table behind
 * `estimated_cost_usd` on every usage record. These are public pay-as-you-go list prices, not an
 * invoice: a contract rate, a promotion or tax changes what is actually paid. The API has no
 * pricing endpoint, so when that page changes this file changes with it — each entry carries the
 * date its rate was last checked.
 */

/** 1 is the cheapest quarter of its comparison group, 4 the dearest. Absent when not comparable. */
export type PriceTier = 1 | 2 | 3 | 4;

export interface PriceTag {
  /** The figure shown on the option row, e.g. `$0.10 / $0.50`. */
  headline: string;
  /** What the headline is per, e.g. `in / out · 1M tokens`. */
  unit: string;
  /** The full breakdown, shown under the select once a model is chosen. */
  detail: string;
  tier?: PriceTier;
  /** When the source rate was last checked. */
  checked: string;
}

/** `$0.10`, `$0.025`, `$32` — no padding beyond the cents, and no trailing `.00` on whole dollars. */
const usd = (amount: number): string => {
  const [whole, fraction = ""] = Number(amount.toFixed(4)).toString().split(".");
  return `$${whole}${fraction ? `.${fraction.padEnd(2, "0")}` : ""}`;
};

const tierOf = (value: number, [a, b, c]: [number, number, number]): PriceTier =>
  value <= a ? 1 : value <= b ? 2 : value <= c ? 3 : 4;

// Text models: cascade, and the duplex backend. Per 1M tokens.
const text = (input: number, cached: number, output: number, checked = "2026-09-06"): PriceTag => ({
  headline: `${usd(input)} / ${usd(output)}`,
  unit: "in / out · 1M",
  detail: `Input ${usd(input)} · cached input ${usd(cached)} · output ${usd(output)} per 1M tokens`,
  tier: tierOf(output, [1.5, 5, 15]),
  checked,
});

// Realtime models, OpenAI and Gemini. Per 1M tokens, graded on audio out — what a voice call mostly buys.
const realtime = (audioIn: number, audioOut: number, textIn: number, textOut: number, checked: string): PriceTag => ({
  headline: `${usd(audioIn)} / ${usd(audioOut)}`,
  unit: "audio in / out · 1M",
  detail: `Audio ${usd(audioIn)} in · ${usd(audioOut)} out; text ${usd(textIn)} in · ${usd(textOut)} out, per 1M tokens`,
  tier: tierOf(audioOut, [20, 40, 70]),
  checked,
});

// Speech to text, graded on the per-hour equivalent so per-minute and per-hour rates compare.
const sttPerMinute = (perMinute: number, checked: string): PriceTag => ({
  headline: usd(perMinute),
  unit: "per minute",
  detail: `${usd(perMinute)} per minute of audio (about ${usd(perMinute * 60)} per hour)`,
  tier: tierOf(perMinute * 60, [0.25, 0.4, 0.5]),
  checked,
});

const sttPerHour = (perHour: number, checked: string, detail?: string): PriceTag => ({
  headline: usd(perHour),
  unit: "per hour",
  detail: detail ?? `${usd(perHour)} per hour of audio`,
  tier: tierOf(perHour, [0.25, 0.4, 0.5]),
  checked,
});

const sttTokens = (audioIn: number, textOut: number, checked = "2026-09-06"): PriceTag => ({
  headline: `${usd(audioIn)} / ${usd(textOut)}`,
  unit: "audio in / text out · 1M",
  detail: `Audio ${usd(audioIn)} in · text ${usd(textOut)} out, per 1M tokens`,
  checked,
});

// Text to speech. Per 1K characters.
const ttsPerKChars = (price: number, checked: string, detail?: string): PriceTag => ({
  headline: usd(price),
  unit: "per 1K chars",
  detail: detail ?? `${usd(price)} per 1,000 characters spoken`,
  tier: tierOf(price, [0.02, 0.04, 0.06]),
  checked,
});

/** Cascade `model`, and the duplex `backend_model`. The retired pair is not offered, so not priced. */
export const TEXT_PRICES: Record<string, PriceTag> = {
  "gpt-4.1": text(2, 0.5, 8),
  "gpt-4.1-mini": text(0.4, 0.1, 1.6),
  "gpt-4.1-nano": text(0.1, 0.025, 0.4),
  "gpt-4o": text(2.5, 1.25, 10),
  "gpt-4o-mini": text(0.15, 0.075, 0.6),
  "gpt-5": text(1.25, 0.125, 10),
  "gpt-5-mini": text(0.25, 0.025, 2),
  "gpt-5-nano": text(0.05, 0.005, 0.4),
  "gpt-5.2": text(1.75, 0.175, 14),
  "gpt-5.4": text(2.5, 0.25, 15),
  "gpt-5.4-mini": text(0.75, 0.075, 4.5),
  "gpt-5.5": text(5, 0.5, 30),
  "gpt-5.6-sol": text(4, 0.4, 20),
  "gpt-5.6-terra": text(2, 0.2, 12),
  "gpt-5.6-luna": text(0.2, 0.02, 1.2),
  "gpt-6-luna": text(0.1, 0.01, 0.5, "2026-10-17"),
  "gpt-6-sol": text(2, 0.2, 10, "2026-10-17"),
};

/** OpenAI realtime `model` for pipeline and realtime. */
export const REALTIME_PRICES: Record<string, PriceTag> = {
  "gpt-realtime": realtime(32, 64, 4, 16, "2026-09-06"),
  "gpt-realtime-1.5": realtime(32, 64, 4, 16, "2026-09-06"),
  "gpt-realtime-2": realtime(32, 64, 4, 24, "2026-09-06"),
  "gpt-realtime-2025-08-28": realtime(32, 64, 4, 16, "2026-09-06"),
  "gpt-realtime-2.1": realtime(32, 64, 4, 24, "2026-10-17"),
  "gpt-realtime-mini": realtime(10, 20, 0.6, 2.4, "2026-09-06"),
  "gpt-realtime-2.1-mini": realtime(10, 20, 0.6, 2.4, "2026-10-17"),
};

/** Gemini Live `model` for realtime. Thinking tokens bill as output text. */
export const GEMINI_PRICES: Record<string, PriceTag> = {
  "gemini-3.8-live": realtime(3, 12, 0.75, 4.5, "2026-09-22"),
  "gemini-3.8-live-extended-thinking": realtime(3, 12, 0.75, 4.5, "2026-09-22"),
  "gemini-3.1-flash-live-preview": realtime(3, 12, 0.75, 4.5, "2026-09-22"),
  "gemini-2.5-flash-native-audio-preview-12-2025": realtime(3, 12, 0.5, 2, "2026-09-22"),
};

/** GPT-Live: billed per second of open session. The backend model's tokens are billed on top. */
export const DUPLEX_VOICE_PRICE: PriceTag = {
  headline: usd(0.05),
  unit: "per minute",
  detail: `${usd(0.05)} per minute of open session, billed per second — plus the backend model's tokens at its own rate`,
  checked: "2026-10-17",
};

/** STT `model`, keyed `provider:model`. */
export const STT_PRICES: Record<string, PriceTag> = {
  "sarvam:saaras:v3": sttPerHour(0.36, "2026-09-06", "INR 30 per hour (about $0.36)"),
  "sarvam:saaras:v4": sttPerHour(0.36, "2026-09-06", "INR 30 per hour (about $0.36)"),
  "cartesia:ink-whisper": sttPerHour(0.42, "2026-09-22", "About $0.42 per hour — derived from a plan tier, not a quoted rate"),
  "cartesia:ink-2": sttPerHour(0.42, "2026-09-22", "About $0.42 per hour — derived from a plan tier, not a quoted rate"),
  "deepgram:nova-3": sttPerMinute(0.0077, "2026-09-22"),
  "deepgram:nova-3-general": sttPerMinute(0.0077, "2026-09-22"),
  "deepgram:nova-3-multilingual": sttPerMinute(0.0092, "2026-09-22"),
  "deepgram:flux-general-en": sttPerMinute(0.0077, "2026-09-22"),
  "deepgram:flux-general-multi": sttPerMinute(0.0078, "2026-09-22"),
  "elevenlabs:scribe_v2_realtime": sttPerHour(0.39, "2026-09-06"),
  "elevenlabs:scribe_v2": sttPerHour(0.22, "2026-09-06"),
  "elevenlabs:scribe_v1": sttPerHour(0.22, "2026-09-06"),
  "openai:gpt-4o-mini-transcribe": sttTokens(1.25, 5),
  "openai:gpt-4o-transcribe": sttTokens(2.5, 10),
  "openai:whisper-1": sttPerMinute(0.006, "2026-09-06"),
};

/** TTS `model`, keyed `provider:model`. Providers with a pinned model are keyed by it. */
export const TTS_PRICES: Record<string, PriceTag> = {
  "elevenlabs:eleven_v3": ttsPerKChars(0.08, "2026-10-17"),
  "elevenlabs:eleven_v3_conversational": ttsPerKChars(0.04, "2026-10-17"),
  "elevenlabs:eleven_v4": ttsPerKChars(0.08, "2026-10-17"),
  "elevenlabs:eleven_v4_turbo": ttsPerKChars(0.04, "2026-10-17"),
  "elevenlabs:eleven_multilingual_v2": ttsPerKChars(0.08, "2026-10-17"),
  "elevenlabs:eleven_turbo_v2_5": ttsPerKChars(0.04, "2026-10-17"),
  "elevenlabs:eleven_flash_v2_5": ttsPerKChars(0.04, "2026-10-17"),
  "sarvam:bulbul:v3": ttsPerKChars(0.036, "2026-09-06", "INR 30 per 10K characters (about $0.036 per 1K)"),
  "sarvam:bulbul:v4-flash": ttsPerKChars(
    0.024,
    "2026-10-17",
    "INR 20 per 10K characters (about $0.024 per 1K) — list price; a launch offer halves it until 2026-11-12",
  ),
  "cartesia:sonic-3": ttsPerKChars(0.039, "2026-09-22", "About $0.039 per 1K characters — derived from a plan tier, not a quoted rate"),
  "mistral:voxtral-mini-tts-2603": ttsPerKChars(0.016, "2026-09-22"),
};

/** The price of a TTS provider whose synthesis model is pinned, shown on the provider itself. */
export const PINNED_TTS_PRICE: Record<string, PriceTag> = {
  cartesia: TTS_PRICES["cartesia:sonic-3"],
  mistral: TTS_PRICES["mistral:voxtral-mini-tts-2603"],
};
