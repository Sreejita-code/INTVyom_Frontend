import { describe, expect, it } from "vitest";

import {
  DUPLEX_BACKEND_MODELS,
  DUPLEX_VOICES,
  GEMINI_LIVE_MODELS,
  GEMINI_LIVE_VOICES,
  OPENAI_CASCADE_MODELS,
  OPENAI_REALTIME_MODELS,
  SARVAM_BULBUL_V3_SPEAKERS,
  STT_PROVIDERS,
  TTS_PROVIDERS,
  elevenLabsReadsSetting,
  getSttModelError,
  isReasoningModel,
  sttInertReason,
  ttsFieldsFor,
  ttsInertReason,
} from "@/routes/dashboard/assistant/providerCatalog";
import { SARVAM_V4_FLASH_SPEAKERS } from "@/routes/dashboard/assistant/sarvamSpeakers";

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

describe("STT validation matches the backend's current rules", () => {
  it("lets saaras:v4 use every transcription style, like saaras:v3", () => {
    expect(getSttModelError("sarvam", "saaras:v4", { mode: "translate" })).toBeNull();
    expect(sttInertReason("sarvam", "mode", { model: "saaras:v4" })).toBeUndefined();
  });

  it("accepts any BCP-47 language on Deepgram, and still rejects other standards", () => {
    expect(getSttModelError("deepgram", "nova-3", { language: "sw-KE" })).toBeNull();
    expect(getSttModelError("deepgram", "nova-3", { language: "hin" })).toMatch(/BCP-47/);
  });

  it("accepts any ISO 639-1 language on OpenAI, and still rejects a region-tagged code", () => {
    expect(getSttModelError("openai", "gpt-4o-mini-transcribe", { language: "sw" })).toBeNull();
    expect(getSttModelError("openai", "gpt-4o-mini-transcribe", { language: "hi-IN" })).toMatch(/ISO 639-1/);
  });

  it("rejects models that are not in the catalog", () => {
    expect(getSttModelError("deepgram", "nova-2")).toMatch(/Invalid Deepgram model/);
    expect(getSttModelError("sarvam", "saarika:v2.5")).toMatch(/Invalid Sarvam model/);
  });
});

describe("OpenAI model lists mirror upstream 1.6.0", () => {
  const cascade = OPENAI_CASCADE_MODELS.map((m) => m.value);
  const realtime = OPENAI_REALTIME_MODELS.map((m) => m.value);

  it("cascade drops the retired pair and adds gpt-6", () => {
    expect(cascade).not.toContain("gpt-5.1");
    expect(cascade).not.toContain("gpt-5.4-nano");
    expect(cascade).toEqual(expect.arrayContaining(["gpt-6-sol", "gpt-6-luna"]));
  });

  it("treats the gpt-6 models as reasoning models", () => {
    expect(isReasoningModel("gpt-6-sol")).toBe(true);
    expect(isReasoningModel("gpt-6-luna")).toBe(true);
  });

  it("realtime adds the 2.1 pair", () => {
    expect(realtime).toEqual(expect.arrayContaining(["gpt-realtime-2.1", "gpt-realtime-2.1-mini"]));
  });

  it("the duplex backend list is the reasoning models only, with the documented default", () => {
    const values = DUPLEX_BACKEND_MODELS.map((m) => m.value);
    expect(values).toContain("gpt-5.6-luna");
    expect(values).toContain("gpt-6-sol");
    expect(values).not.toContain("gpt-4.1");
    expect(values.every(isReasoningModel)).toBe(true);
  });

  it("GPT-Live offers the six documented voices", () => {
    expect(DUPLEX_VOICES.map((v) => v.value).sort()).toEqual(["beacon", "cedar", "cinder", "marin", "stone", "vesper"]);
  });
});

describe("ElevenLabs voice settings per model", () => {
  it("offers the v4 models", () => {
    expect(optionValues(TTS_PROVIDERS, "elevenlabs", "model")).toEqual(expect.arrayContaining(["eleven_v4", "eleven_v4_turbo"]));
  });

  it.each([
    ["eleven_v3", { stability: true, similarity_boost: false, style: false, speed: false, use_speaker_boost: false }],
    ["eleven_v3_conversational", { stability: true, similarity_boost: false, style: false, speed: false, use_speaker_boost: true }],
    ["eleven_v4", { stability: true, similarity_boost: true, style: false, speed: false, use_speaker_boost: false }],
    ["eleven_turbo_v2_5", { stability: true, similarity_boost: true, style: false, speed: true, use_speaker_boost: false }],
    ["eleven_multilingual_v2", { stability: true, similarity_boost: true, style: true, speed: true, use_speaker_boost: true }],
  ])("%s reads exactly its documented settings", (model, expected) => {
    for (const [key, reads] of Object.entries(expected)) {
      expect(elevenLabsReadsSetting(model, key)).toBe(reads);
      expect(ttsInertReason("elevenlabs", key, { model }) === undefined).toBe(reads);
    }
  });
});

describe("Sarvam Bulbul models", () => {
  it("the v4-flash roster is the 224 documented speakers, sharing no name with v3", () => {
    expect(new Set(SARVAM_V4_FLASH_SPEAKERS).size).toBe(224);
    expect(SARVAM_BULBUL_V3_SPEAKERS.filter((v) => (SARVAM_V4_FLASH_SPEAKERS as readonly string[]).includes(v))).toEqual([]);
  });

  it("resolves the model-dependent fields against the stored model", () => {
    const spec = TTS_PROVIDERS.find((p) => p.value === "sarvam");
    const field = (config: Record<string, unknown>, key: string) => ttsFieldsFor(spec, config).find((f) => f.key === key)!;

    expect(field({}, "speaker").options).toHaveLength(30);
    expect(field({ model: "bulbul:v4-flash" }, "speaker").options).toHaveLength(224);
    expect(field({}, "pace")).toMatchObject({ min: 0.3, max: 3 });
    expect(field({ model: "bulbul:v4-flash" }, "pace")).toMatchObject({ min: 0.5, max: 2 });
    expect(field({}, "target_language_code").options).toHaveLength(11);
    expect(field({ model: "bulbul:v4-flash" }, "target_language_code").options).toHaveLength(23);
    expect(field({ model: "bulbul:v4-flash" }, "speech_sample_rate").options?.map((o) => o.value)).toEqual(["8000", "16000", "22050", "24000"]);
  });

  it("greys temperature on v4-flash only", () => {
    expect(ttsInertReason("sarvam", "temperature", { model: "bulbul:v4-flash" })).toMatch(/0\.6/);
    expect(ttsInertReason("sarvam", "temperature", {})).toBeUndefined();
  });
});
