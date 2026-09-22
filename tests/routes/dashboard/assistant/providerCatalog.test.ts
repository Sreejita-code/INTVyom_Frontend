import { describe, expect, it } from "vitest";

import {
  GEMINI_LIVE_MODELS,
  GEMINI_LIVE_VOICES,
  STT_PROVIDERS,
  TTS_PROVIDERS,
} from "@/routes/dashboard/assistant/providerCatalog";

/**
 * These lists are a mirror of the backend's `src/assistant/assistant.rules.js`. When the backend
 * moves a model, this file fails first — which is the point: a drifted list means the form offers
 * a value the API answers 400 for, or hides one it accepts.
 */
const optionValues = (providers: typeof STT_PROVIDERS, provider: string, field: string) => {
  const spec = providers.find((p) => p.value === provider);
  const control = spec?.fields.find((f) => f.key === field);
  return (control?.options ?? []).map((o) => o.value);
};

describe("Gemini Live models", () => {
  it("offers the current default and the extended-thinking sibling", () => {
    const values = GEMINI_LIVE_MODELS.map((m) => m.value);
    expect(values).toContain("gemini-3.8-live");
    expect(values).toContain("gemini-3.8-live-extended-thinking");
  });

  it("drops the Vertex-only id the upstream API rejects", () => {
    expect(GEMINI_LIVE_MODELS.map((m) => m.value)).not.toContain("gemini-live-2.5-flash-native-audio");
  });
});

describe("Gemini Live voices", () => {
  it("is the plugin's closed 30-name roster", () => {
    expect(GEMINI_LIVE_VOICES).toHaveLength(30);
    const values = GEMINI_LIVE_VOICES.map((v) => v.value);
    expect(values).toContain("Zephyr");
    expect(values).toContain("Sulafat");
  });

  it("does not carry names outside the backend roster", () => {
    // Names the old, drifted list offered but the backend never accepted.
    const values = GEMINI_LIVE_VOICES.map((v) => v.value);
    expect(values).not.toContain("Pegasus");
    expect(values).not.toContain("Achilles");
  });
});

describe("STT model mirrors", () => {
  it("Sarvam offers saaras:v4 and not the sunset v2.5 ids", () => {
    const values = optionValues(STT_PROVIDERS, "sarvam", "model");
    expect(values).toContain("saaras:v4");
    expect(values).not.toContain("saaras:v2.5");
    expect(values).not.toContain("saarika:v2.5");
  });

  it("Deepgram offers the multilingual nova-3 ids and not nova-2", () => {
    const values = optionValues(STT_PROVIDERS, "deepgram", "model");
    expect(values).toContain("nova-3-multilingual");
    expect(values).toContain("nova-3-general");
    expect(values).not.toContain("nova-2");
  });
});

describe("ElevenLabs TTS models", () => {
  it("includes eleven_v3_conversational", () => {
    expect(optionValues(TTS_PROVIDERS, "elevenlabs", "model")).toContain("eleven_v3_conversational");
  });
});
