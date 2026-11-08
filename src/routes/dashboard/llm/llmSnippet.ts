import type { RequestSpec } from "@/lib/apiSnippet";
import type { ChatMessage, LlmProvider } from "@/types/llm";

export interface LlmSnippetValues {
  messages: ChatMessage[];
  provider?: LlmProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  assistantId?: string;
}

export function buildLlmSpec(values: LlmSnippetValues, stream: boolean): RequestSpec {
  const body: Record<string, unknown> = { messages: values.messages };
  if (values.assistantId) body.assistant_id = values.assistantId;
  if (values.provider) body.provider = values.provider;
  if (values.model?.trim()) body.model = values.model.trim();
  if (values.temperature !== undefined) body.temperature = values.temperature;
  if (values.maxTokens !== undefined) body.max_tokens = values.maxTokens;
  body.stream = stream;
  return {
    id: stream ? "llm.chat.stream" : "llm.chat",
    title: stream ? "Chat (streamed)" : "Chat",
    method: "POST",
    path: "/api/llm/chat",
    body,
    response: stream ? "stream" : undefined,
  };
}
