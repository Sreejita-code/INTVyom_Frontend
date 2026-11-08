import { authedFetch } from "@/services/auth/authedFetch";
import { readJson } from "@/lib/readJson";
import type { TtsRequest, TtsResult, TtsUsage } from "@/types/tts";

const TTS_URL = `${import.meta.env.VITE_BACKEND_URL}/api/tts/synthesize`;

/** The usage headers the audio format carries. Cross-origin they are readable only if the server exposes them. */
const numberHeader = (headers: Headers, name: string): number | null => {
  const raw = headers.get(name);
  if (raw === null || raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export function buildSynthesizeBody(request: TtsRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    text: request.text,
    save_to_library: request.saveToLibrary,
    response_format: request.responseFormat,
  };
  if (request.provider) body.provider = request.provider;
  if (request.model) body.model = request.model;
  if (request.voice) body.voice = request.voice;
  if (request.language) body.language = request.language;
  if (request.assistantId) body.assistant_id = request.assistantId;
  return body;
}

export async function callSynthesizeEndpoint(args: {
  request: TtsRequest;
  providerKey?: string;
  signal?: AbortSignal;
}): Promise<{ ok: boolean; status: number; json?: unknown; blob?: Blob; headers?: Headers }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (args.providerKey) headers["X-Provider-API-Key"] = args.providerKey;
  const res = await authedFetch(TTS_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(buildSynthesizeBody(args.request)),
    signal: args.signal,
  });
  if (!res.ok) return { ok: false, status: res.status, json: await readJson(res) };
  if (args.request.responseFormat === "json") {
    return { ok: true, status: res.status, json: await readJson(res) };
  }
  return { ok: true, status: res.status, blob: await res.blob(), headers: res.headers };
}

export function condenseSynthesizeJsonResponse(json: unknown): TtsResult {
  const data = ((json as { data?: Record<string, unknown> })?.data ?? {}) as Record<string, unknown>;
  const usage = (data.usage ?? {}) as Record<string, unknown>;
  const num = (value: unknown) => (typeof value === "number" ? value : null);
  const mediaType = typeof data.media_type === "string" ? data.media_type : "audio/wav";
  const base64 = typeof data.audio_base64 === "string" ? data.audio_base64 : "";
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return {
    audio: new Blob([bytes], { type: mediaType }),
    mediaType,
    provider: typeof data.provider === "string" ? data.provider : "",
    model: typeof data.model === "string" ? data.model : null,
    usage: {
      charactersCount: num(usage.characters_count),
      audioDurationSeconds: num(usage.audio_duration_seconds),
      estimatedCostUsd: num(usage.estimated_cost_usd),
      pricingComplete: usage.pricing_complete === true,
    },
  };
}

/** Audio format: usage comes from the headers, and is `null` when none is readable. */
export function condenseSynthesizeAudioResponse(blob: Blob, headers: Headers): TtsResult {
  const characters = numberHeader(headers, "X-TTS-Characters");
  const duration = numberHeader(headers, "X-Audio-Duration");
  const cost = numberHeader(headers, "X-Estimated-Cost-USD");
  const pricing = headers.get("X-Pricing-Complete");
  const usage: TtsUsage | null =
    characters === null && duration === null && cost === null && pricing === null
      ? null
      : {
          charactersCount: characters,
          audioDurationSeconds: duration,
          estimatedCostUsd: cost,
          pricingComplete: pricing === "true",
        };
  return {
    audio: blob,
    mediaType: blob.type || headers.get("Content-Type") || "audio/wav",
    provider: headers.get("X-Provider") ?? "",
    model: headers.get("X-Model"),
    usage,
  };
}
