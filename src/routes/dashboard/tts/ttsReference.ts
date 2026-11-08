import type { EndpointReferenceData } from "@/components/common/EndpointReference";

export const TTS_REFERENCE: EndpointReferenceData = {
  request: [
    { name: "text", type: "string", required: true, description: "Text to speak. 1 to 5,000 characters." },
    { name: "assistant_id", type: "string", description: "Assistant whose TTS settings fill in the fields left blank." },
    { name: "provider", type: "string", description: "cartesia, sarvam, elevenlabs or mistral. Default cartesia." },
    { name: "model", type: "string", description: "Provider model, for example sonic-3 or bulbul:v3." },
    { name: "voice", type: "string", description: "Voice ID, or a Sarvam speaker name such as meera." },
    { name: "language", type: "string", description: "Language code." },
    { name: "save_to_library", type: "boolean", description: "true may store the audio in your Audio Library. Default false." },
    { name: "response_format", type: "string", description: "audio returns the audio bytes; json returns base64 audio and usage. Default audio." },
  ],
  response: [
    { name: "audio_base64", type: "string", description: "json format only. The audio, base64 encoded." },
    { name: "media_type", type: "string", description: "json format only. For example audio/wav." },
    { name: "provider", type: "string", description: "Provider that spoke the text." },
    { name: "model", type: "string", nullable: true, description: "Model that spoke the text." },
    { name: "usage", type: "object", description: "json format only. characters_count, audio_duration_seconds, estimated_cost_usd (nullable), pricing_complete." },
  ],
  errors: [
    { status: 400, cause: "The request body is not valid.", action: "Check the fields against this reference." },
    { status: 401, cause: "The API key is missing or invalid.", action: "Sign in again." },
    { status: 404, cause: "The assistant_id is not on this account.", action: "Pick another assistant or leave it blank." },
    { status: 422, cause: "Empty text, more than 5,000 characters, or a speaker the model does not support.", action: "Shorten the text or change the voice." },
    { status: 502, cause: "The provider failed.", action: "Try again in a moment." },
  ],
  samples: [
    {
      label: "Request",
      body: JSON.stringify({ text: "Hello! Welcome to our platform.", provider: "cartesia", response_format: "json" }, null, 2),
    },
    {
      label: "Response (json)",
      body: JSON.stringify(
        {
          success: true,
          message: "Speech synthesized successfully",
          data: {
            audio_base64: "UklGRiQAAABXQVZFZm10IBAAAAABAAEA...",
            media_type: "audio/wav",
            provider: "cartesia",
            model: "sonic-3",
            usage: { characters_count: 31, audio_duration_seconds: 2.0, estimated_cost_usd: 0.000157, pricing_complete: true },
          },
        },
        null,
        2,
      ),
    },
    {
      label: "Response headers (audio)",
      body: "Content-Type: audio/wav\nX-TTS-Characters: 31\nX-Audio-Duration: 2.000\nX-Estimated-Cost-USD: 0.000157\nX-Pricing-Complete: true\nX-Provider: cartesia\nX-Model: sonic-3",
    },
  ],
};
