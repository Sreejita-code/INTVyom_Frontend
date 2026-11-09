import { OPENAI_CASCADE_MODELS } from "@/routes/dashboard/assistant/providerCatalog";
import type { LlmFormValues } from "./LlmForm";

/** The chat model the /llm/chat docs name for gemini. The Live models open a socket that closes. */
export const GEMINI_CHAT_MODEL = "gemini-2.5-flash";

/** Model id suggestions for the current provider; any typed value is still sent. */
export const llmModelOptions = (provider: LlmFormValues["provider"]): string[] =>
  provider === "gemini" ? [GEMINI_CHAT_MODEL] : OPENAI_CASCADE_MODELS.map((m) => m.value);

export const EMPTY_LLM_VALUES: LlmFormValues = {
  messages: [{ role: "user", content: "" }],
  provider: "",
  model: "",
  temperature: "",
  maxTokens: "",
  stream: false,
  assistantId: "",
  providerKey: "",
};

export const llmBlockReason = (values: LlmFormValues): string | null => {
  if (!values.messages.some((message) => message.content.trim() !== "")) return "Add a message with some content.";
  if (values.temperature !== "") {
    const t = Number(values.temperature);
    if (!Number.isFinite(t) || t < 0 || t > 2) return "Temperature must be between 0 and 2.";
  }
  if (values.maxTokens !== "") {
    const m = Number(values.maxTokens);
    if (!Number.isInteger(m) || m < 1) return "Max tokens must be 1 or more.";
  }
  return null;
};
