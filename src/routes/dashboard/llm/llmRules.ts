import type { LlmFormValues } from "./LlmForm";

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
