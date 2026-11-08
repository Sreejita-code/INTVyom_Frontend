import type { EndpointReferenceData } from "@/components/common/EndpointReference";

export const STT_REFERENCE: EndpointReferenceData = {
  request: [
    { name: "file", type: "binary", required: true, description: "Audio file: wav, mp3, ogg, webm or m4a. Maximum 25 MB." },
    { name: "assistant_id", type: "string", description: "Assistant whose STT settings fill in the fields left blank." },
    { name: "provider", type: "string", description: "sarvam, cartesia, deepgram, openai or elevenlabs. Default sarvam." },
    { name: "model", type: "string", description: "Provider model, for example saaras:v3, nova-3 or whisper-1." },
    { name: "language", type: "string", description: "Language code, for example en-US, hi-IN or auto." },
  ],
  response: [
    { name: "text", type: "string", description: "The transcript." },
    { name: "language", type: "string", nullable: true, description: "Detected or requested language." },
    { name: "duration_seconds", type: "number", nullable: true, description: "Length of the audio in seconds." },
    { name: "provider", type: "string", description: "Provider that transcribed the audio." },
    { name: "model", type: "string", nullable: true, description: "Model that transcribed the audio." },
    { name: "usage", type: "object", description: "audio_duration_seconds, estimated_cost_usd (nullable), pricing_complete, provider, model." },
  ],
  errors: [
    { status: 400, cause: "No file, or the upload is not valid multipart.", action: "Choose an audio file and send again." },
    { status: 401, cause: "The API key is missing or invalid.", action: "Sign in again." },
    { status: 404, cause: "The assistant_id is not on this account.", action: "Pick another assistant or leave it blank." },
    { status: 413, cause: "The file is over 25 MB.", action: "Upload a shorter or smaller recording." },
    { status: 422, cause: "Empty audio, or the provider or model is not supported.", action: "Check the provider, model and file." },
    { status: 502, cause: "The provider failed or the network dropped.", action: "Try again in a moment." },
  ],
  samples: [
    {
      label: "Response",
      body: JSON.stringify(
        {
          success: true,
          message: "Audio transcribed successfully",
          data: {
            text: "Hello world, this is a transcribed message.",
            language: "en",
            duration_seconds: 2.4,
            provider: "sarvam",
            model: "saaras:v3",
            usage: { audio_duration_seconds: 2.4, estimated_cost_usd: 0.000239, pricing_complete: true, provider: "sarvam", model: "saaras:v3" },
          },
        },
        null,
        2,
      ),
    },
  ],
};
