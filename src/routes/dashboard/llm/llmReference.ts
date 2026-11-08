import type { EndpointReferenceData } from "@/components/common/EndpointReference";

export const LLM_REFERENCE: EndpointReferenceData = {
  request: [
    { name: "messages", type: "array", required: true, description: "One or more { role, content } objects. role is system, user or assistant." },
    { name: "assistant_id", type: "string", description: "Assistant whose LLM settings fill in the fields left blank." },
    { name: "provider", type: "string", description: "openai or gemini. Default openai." },
    { name: "model", type: "string", description: "Model name, for example gpt-5.4 or gemini-2.5-flash." },
    { name: "temperature", type: "number", description: "0 to 2." },
    { name: "max_tokens", type: "integer", description: "Maximum tokens to generate. At least 1." },
    { name: "stream", type: "boolean", description: "true returns Server-Sent Events. Default false." },
  ],
  response: [
    { name: "message", type: "object", description: "{ role: \"assistant\", content }: the reply." },
    { name: "provider", type: "string", description: "Provider that answered." },
    { name: "model", type: "string", nullable: true, description: "Model that answered." },
    { name: "usage", type: "object", description: "prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd (nullable), pricing_complete, provider, model." },
  ],
  errors: [
    { status: 400, cause: "The request body is not valid.", action: "Check the fields against this reference." },
    { status: 401, cause: "The API key is missing or invalid.", action: "Sign in again." },
    { status: 404, cause: "The assistant_id is not on this account.", action: "Pick another assistant or leave it blank." },
    { status: 422, cause: "No messages, or the provider or model is not supported.", action: "Add a message or change the provider or model." },
    { status: 502, cause: "The provider failed or timed out.", action: "Try again in a moment." },
  ],
  samples: [
    {
      label: "Stream event",
      body: 'data: {"choices":[{"delta":{"content":"We"}}]}\n\ndata: [DONE]',
    },
    {
      label: "Response",
      body: JSON.stringify(
        {
          success: true,
          message: "Chat completion successful",
          data: {
            message: { role: "assistant", content: "We offer voice AI calling, speech-to-text, and conversational agents." },
            provider: "openai",
            model: "gpt-5.4",
            usage: { prompt_tokens: 24, completion_tokens: 16, total_tokens: 40, estimated_cost_usd: 0.00019, pricing_complete: true, provider: "openai", model: "gpt-5.4" },
          },
        },
        null,
        2,
      ),
    },
  ],
};
