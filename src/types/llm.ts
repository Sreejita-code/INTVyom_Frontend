export type LlmProvider = "openai" | "gemini";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LlmRequest {
  messages: ChatMessage[];
  provider?: LlmProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  assistantId?: string;
}

export interface LlmUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  pricingComplete: boolean;
}

export interface LlmResult {
  message: ChatMessage;
  provider: string;
  model: string | null;
  usage: LlmUsage;
}
