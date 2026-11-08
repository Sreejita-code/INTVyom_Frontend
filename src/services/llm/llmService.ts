import { authedFetch } from "@/services/auth/authedFetch";
import { readJson } from "@/lib/readJson";
import type { LlmRequest, LlmResult } from "@/types/llm";
import type { ServiceResponse } from "@/types/http";

const LLM_URL = `${import.meta.env.VITE_BACKEND_URL}/api/llm/chat`;

/** Maps the form values to the wire body. Unset options are left out, never sent as null. */
export function buildChatBody(request: LlmRequest, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = { messages: request.messages, stream };
  if (request.provider) body.provider = request.provider;
  if (request.model) body.model = request.model;
  if (request.temperature !== undefined) body.temperature = request.temperature;
  if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
  if (request.assistantId) body.assistant_id = request.assistantId;
  return body;
}

const chatHeaders = (providerKey?: string): Record<string, string> =>
  providerKey ? { "Content-Type": "application/json", "X-Provider-API-Key": providerKey } : { "Content-Type": "application/json" };

export async function callChatEndpoint(args: {
  request: LlmRequest;
  providerKey?: string;
  signal?: AbortSignal;
}): Promise<ServiceResponse<unknown> & { status: number }> {
  const res = await authedFetch(LLM_URL, {
    method: "POST",
    headers: chatHeaders(args.providerKey),
    body: JSON.stringify(buildChatBody(args.request, false)),
    signal: args.signal,
  });
  return { ok: res.ok, status: res.status, json: await readJson(res) };
}

/**
 * Starts a streamed reply. The caller reads `response.body`. A failed start returns its JSON
 * error instead. An abort is not caught here, so the caller can tell a Stop from a failure.
 */
export async function callChatStreamEndpoint(args: {
  request: LlmRequest;
  providerKey?: string;
  signal?: AbortSignal;
}): Promise<{ ok: boolean; status: number; response?: Response; json?: unknown }> {
  const res = await authedFetch(LLM_URL, {
    method: "POST",
    headers: chatHeaders(args.providerKey),
    body: JSON.stringify(buildChatBody(args.request, true)),
    signal: args.signal,
  });
  if (!res.ok) return { ok: false, status: res.status, json: await readJson(res) };
  return { ok: true, status: res.status, response: res };
}

export function condenseChatResponse(json: unknown): LlmResult {
  const data = ((json as { data?: Record<string, unknown> })?.data ?? {}) as Record<string, unknown>;
  const message = (data.message ?? {}) as Record<string, unknown>;
  const usage = (data.usage ?? {}) as Record<string, unknown>;
  const num = (value: unknown) => (typeof value === "number" ? value : null);
  return {
    message: {
      role: "assistant",
      content: typeof message.content === "string" ? message.content : "",
    },
    provider: typeof data.provider === "string" ? data.provider : "",
    model: typeof data.model === "string" ? data.model : null,
    usage: {
      promptTokens: num(usage.prompt_tokens),
      completionTokens: num(usage.completion_tokens),
      totalTokens: num(usage.total_tokens),
      estimatedCostUsd: num(usage.estimated_cost_usd),
      pricingComplete: usage.pricing_complete === true,
    },
  };
}
