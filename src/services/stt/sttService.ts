import { authedFetch } from "@/services/auth/authedFetch";
import { readJson } from "@/lib/readJson";
import type { SttRequest, SttResult } from "@/types/stt";
import type { ServiceResponse } from "@/types/http";

const STT_URL = `${import.meta.env.VITE_BACKEND_URL}/api/stt/transcribe`;

/** Only the fields the user set are appended; an empty or undefined value is never sent. */
export function buildTranscribeForm({ file, provider, model, language, assistantId }: SttRequest): FormData {
  const form = new FormData();
  form.append("file", file, file.name);
  if (provider) form.append("provider", provider);
  if (model) form.append("model", model);
  if (language) form.append("language", language);
  if (assistantId) form.append("assistant_id", assistantId);
  return form;
}

export async function callTranscribeEndpoint(args: {
  request: SttRequest;
  providerKey?: string;
  signal?: AbortSignal;
}): Promise<ServiceResponse<unknown> & { status: number }> {
  const headers: Record<string, string> = {};
  if (args.providerKey) headers["X-Provider-API-Key"] = args.providerKey;
  const res = await authedFetch(STT_URL, {
    method: "POST",
    body: buildTranscribeForm(args.request),
    headers,
    signal: args.signal,
  });
  return { ok: res.ok, status: res.status, json: await readJson(res) };
}

export function condenseTranscribeResponse(json: unknown): SttResult {
  const data = ((json as { data?: Record<string, unknown> })?.data ?? {}) as Record<string, unknown>;
  const usage = (data.usage ?? {}) as Record<string, unknown>;
  const num = (value: unknown) => (typeof value === "number" ? value : null);
  return {
    text: typeof data.text === "string" ? data.text : "",
    language: typeof data.language === "string" ? data.language : null,
    durationSeconds: num(data.duration_seconds),
    provider: typeof data.provider === "string" ? data.provider : "",
    model: typeof data.model === "string" ? data.model : null,
    usage: {
      audioDurationSeconds: num(usage.audio_duration_seconds),
      estimatedCostUsd: num(usage.estimated_cost_usd),
      pricingComplete: usage.pricing_complete === true,
    },
  };
}
