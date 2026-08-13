import { describe, expect, it } from "vitest";

import {
  applyModeChange,
  applySttProvider,
  buildAssistantPayload,
  hydrateForm,
} from "@/routes/dashboard/assistant/assistantConfig";
import { emptyForm } from "@/routes/dashboard/assistant/constants";
import { AssistantDetail } from "@/types/assistant";

const form = (overrides: Partial<AssistantDetail> = {}): AssistantDetail => ({
  ...emptyForm,
  assistant_name: "Support Bot",
  assistant_description: "First line support",
  assistant_prompt: "You are helpful.",
  ...overrides,
});

describe("applyModeChange", () => {
  it("moves a Gemini assistant to OpenAI when it leaves realtime", () => {
    const next = applyModeChange(
      form({ assistant_mode: "realtime", assistant_llm_config: { provider: "gemini", model: "gemini-3.1-flash-live-preview" } }),
      "pipeline",
    );

    expect(next.assistant_llm_config?.provider).toBe("openai");
    expect(next.assistant_llm_config?.model).toBe("gpt-realtime-1.5");
  });

  it("swaps the model family in both directions", () => {
    const toCascade = applyModeChange(
      form({ assistant_mode: "pipeline", assistant_llm_config: { provider: "openai", model: "gpt-realtime-1.5" } }),
      "cascade",
    );
    expect(toCascade.assistant_llm_config?.model).toBe("gpt-4.1");

    const backToPipeline = applyModeChange(toCascade, "pipeline");
    expect(backToPipeline.assistant_llm_config?.model).toBe("gpt-realtime-1.5");
  });

  it("keeps a model that is already valid for the target mode", () => {
    const next = applyModeChange(
      form({ assistant_mode: "cascade", assistant_llm_config: { provider: "openai", model: "gpt-5-mini" } }),
      "cascade",
    );
    expect(next.assistant_llm_config?.model).toBe("gpt-5-mini");
  });

  it("replaces native transcription when entering cascade, since there is no realtime model", () => {
    const next = applyModeChange(form({ assistant_mode: "pipeline", assistant_stt_model: "native" }), "cascade");

    expect(next.assistant_stt_model).toBe("sarvam");
    expect(next.assistant_stt_config).toMatchObject({ model: "saaras:v3", language: "unknown", mode: "codemix" });
  });

  it("forces filler words off in realtime, matching what the API does anyway", () => {
    const next = applyModeChange(
      form({ assistant_interaction_config: { ...emptyForm.assistant_interaction_config, filler_words: true } }),
      "realtime",
    );
    expect(next.assistant_interaction_config?.filler_words).toBe(false);
  });
});

describe("applySttProvider", () => {
  it("resets the config so one vendor's fields never reach another", () => {
    const next = applySttProvider(
      form({ assistant_stt_model: "sarvam", assistant_stt_config: { model: "saaras:v3", language: "unknown", mode: "codemix" } }),
      "deepgram",
    );

    expect(next.assistant_stt_config).toEqual({ model: "nova-3", language: "multi" });
    expect(next.assistant_stt_config).not.toHaveProperty("mode");
  });
});

describe("buildAssistantPayload", () => {
  it("sends null for speech stages in realtime mode", () => {
    const payload = buildAssistantPayload(form({ assistant_mode: "realtime" }));

    expect(payload).toHaveProperty("assistant_tts_model", null);
    expect(payload).toHaveProperty("assistant_stt_model", null);
    expect(payload.assistant_interaction_config.filler_words).toBe(false);
  });

  it("sends the voice only in realtime, where the model speaks it", () => {
    const withVoice = { provider: "openai", model: "gpt-realtime-1.5", voice: "marin" };

    expect(buildAssistantPayload(form({ assistant_mode: "realtime", assistant_llm_config: withVoice })).assistant_llm_config)
      .toHaveProperty("voice", "marin");
    expect(buildAssistantPayload(form({ assistant_mode: "pipeline", assistant_llm_config: withVoice })).assistant_llm_config)
      .toHaveProperty("voice", null);
  });

  it("sends the generation knobs only in cascade, where they are read", () => {
    const llm = { provider: "openai", model: "gpt-4.1", temperature: 0.4, service_tier: "auto", parallel_tool_calls: false };

    const cascade = buildAssistantPayload(form({ assistant_mode: "cascade", assistant_llm_config: llm })).assistant_llm_config;
    expect(cascade).toMatchObject({ temperature: 0.4, service_tier: "auto", parallel_tool_calls: false });

    const pipeline = buildAssistantPayload(form({ assistant_mode: "pipeline", assistant_llm_config: llm })).assistant_llm_config;
    expect(pipeline).toHaveProperty("temperature", null);
  });

  /**
   * Sending `null` for temperature on a reasoning model signals MongoDB PATCH merge to clear stored temperature.
   */
  it("sends null for reasoning effort on a non-reasoning model", () => {
    const payload = buildAssistantPayload(
      form({
        assistant_mode: "cascade",
        assistant_llm_config: { provider: "openai", model: "gpt-4.1", temperature: 0.4, reasoning_effort: "low" },
      }),
    );

    expect(payload.assistant_llm_config).toHaveProperty("reasoning_effort", null);
    expect(payload.assistant_llm_config).toMatchObject({ model: "gpt-4.1", temperature: 0.4 });
  });

  it("sends null for temperature on a reasoning model", () => {
    const payload = buildAssistantPayload(
      form({
        assistant_mode: "cascade",
        assistant_llm_config: { provider: "openai", model: "gpt-5-mini", temperature: 0.4, reasoning_effort: "low" },
      }),
    );

    expect(payload.assistant_llm_config).toHaveProperty("temperature", null);
    expect(payload.assistant_llm_config).toMatchObject({ model: "gpt-5-mini", reasoning_effort: "low" });
  });

  /** `text.verbosity` is a gpt-5 parameter. */
  it("sends verbosity only to the generation that reads it", () => {
    const withVerbosity = (model: string) =>
      buildAssistantPayload(
        form({ assistant_mode: "cascade", assistant_llm_config: { provider: "openai", model, verbosity: "low" } }),
      ).assistant_llm_config;

    expect(withVerbosity("gpt-5.1")).toHaveProperty("verbosity", "low");
    expect(withVerbosity("gpt-5.4")).toHaveProperty("verbosity", "low");
    expect(withVerbosity("gpt-4.1")).toHaveProperty("verbosity", null);
  });

  it("sends null for reasoning_effort on gpt-5.2 and gpt-5.4 models when tools are attached", () => {
    const config = buildAssistantPayload(
      form({
        assistant_mode: "cascade",
        assistant_llm_config: { provider: "openai", model: "gpt-5.2", reasoning_effort: "low" },
      }),
      true
    ).assistant_llm_config;

    expect(config).toHaveProperty("reasoning_effort", null);
  });

  it("survives a cascade → pipeline → cascade round trip with a reasoning effort set", () => {
    const start = form({
      assistant_mode: "cascade",
      assistant_llm_config: { provider: "openai", model: "gpt-5", reasoning_effort: "low" },
    });

    const returned = applyModeChange(applyModeChange(start, "pipeline"), "cascade");
    expect(returned.assistant_llm_config?.model).toBe("gpt-4.1");
    expect(returned.assistant_llm_config?.reasoning_effort).toBe("low");

    expect(buildAssistantPayload(returned).assistant_llm_config).toHaveProperty("reasoning_effort", null);
  });

  it("drops transcriber knobs the chosen model ignores", () => {
    const deepgram = buildAssistantPayload(
      form({
        assistant_mode: "cascade",
        assistant_stt_model: "deepgram",
        assistant_stt_config: { model: "nova-2", language: "en-IN", keyterm: "invoice", enable_diarization: true },
      }),
    ).assistant_stt_config;
    expect(deepgram).toEqual({ model: "nova-2", language: "en-IN", enable_diarization: true });

    const flux = buildAssistantPayload(
      form({
        assistant_mode: "cascade",
        assistant_stt_model: "deepgram",
        assistant_stt_config: { model: "flux-general-en", enable_diarization: true, keyterm: "invoice" },
      }),
    ).assistant_stt_config;
    expect(flux).toEqual({ model: "flux-general-en", keyterm: "invoice" });

    const openai = buildAssistantPayload(
      form({
        assistant_mode: "cascade",
        assistant_stt_model: "openai",
        assistant_stt_config: { model: "gpt-4o-transcribe", detect_language: true, language: "en", prompt: "SKU-1" },
      }),
    ).assistant_stt_config;
    expect(openai).toEqual({ model: "gpt-4o-transcribe", detect_language: true });

    // Sarvam's own warning says transcription style is dropped before the call on v2.5. Now it is.
    const sarvam = buildAssistantPayload(
      form({
        assistant_mode: "cascade",
        assistant_stt_model: "sarvam",
        assistant_stt_config: { model: "saaras:v2.5", language: "hi-IN", mode: "codemix" },
      }),
    ).assistant_stt_config;
    expect(sarvam).toEqual({ model: "saaras:v2.5", language: "hi-IN" });
  });

  it("repairs an unrunnable combination rather than sending it", () => {
    const payload = buildAssistantPayload(
      form({ assistant_mode: "cascade", assistant_llm_config: { provider: "gemini", model: "gemini-3.1-flash-live-preview" } }),
    );

    expect(payload.assistant_llm_config).toMatchObject({ provider: "openai", model: "gpt-4.1" });
  });

  it("drops empty values but keeps false and zero", () => {
    const payload = buildAssistantPayload(
      form({
        assistant_mode: "cascade",
        assistant_stt_model: "elevenlabs",
        // An empty language_code means auto-detect, which is expressed by omitting the key.
        assistant_stt_config: { model: "scribe_v2_realtime", language_code: "", no_verbatim: false },
      }),
    );

    expect(payload.assistant_stt_config).toEqual({ model: "scribe_v2_realtime", no_verbatim: false });
  });

  it("coerces numeric selects, which hand back strings", () => {
    const payload = buildAssistantPayload(
      form({
        assistant_mode: "pipeline",
        assistant_tts_model: "sarvam",
        assistant_tts_config: { speaker: "anushka", speech_sample_rate: "8000" as unknown as number, pace: 1.2 },
      }),
    );

    expect(payload.assistant_tts_config).toEqual({ speaker: "anushka", speech_sample_rate: 8000, pace: 1.2 });
  });

  it("never sends a config for native transcription", () => {
    const payload = buildAssistantPayload(
      form({ assistant_mode: "pipeline", assistant_stt_model: "native", assistant_stt_config: { model: "saaras:v3" } }),
    );

    expect(payload.assistant_stt_config).toEqual({});
  });

  it("strips the masked api_key the API returns, which it would reject on the way back", () => {
    const payload = buildAssistantPayload(
      form({
        assistant_mode: "cascade",
        assistant_tts_model: "cartesia",
        assistant_tts_config: { voice_id: "abc", api_key: "sk-****" } as never,
      }),
    );

    expect(payload.assistant_tts_config).not.toHaveProperty("api_key");
  });

  it("prunes ElevenLabs speed when model is eleven_v3", () => {
    const payload = buildAssistantPayload(
      form({
        assistant_mode: "cascade",
        assistant_tts_model: "elevenlabs",
        assistant_tts_config: { voice_id: "v1", model: "eleven_v3", voice_settings: { speed: 1.1, use_speaker_boost: true } },
      }),
    );

    expect(payload.assistant_tts_config.voice_settings).toEqual({ use_speaker_boost: true });
  });

  it("keeps ElevenLabs speed on models that support it", () => {
    const payload = buildAssistantPayload(
      form({
        assistant_mode: "cascade",
        assistant_tts_model: "elevenlabs",
        assistant_tts_config: { voice_id: "v1", model: "eleven_turbo_v2_5", voice_settings: { speed: 1.1, use_speaker_boost: true } },
      }),
    );

    expect(payload.assistant_tts_config.voice_settings).toEqual({ speed: 1.1, use_speaker_boost: true });
  });
});

describe("hydrateForm", () => {
  it("keeps provider config whole instead of reducing it to the fields the form once knew", () => {
    const hydrated = hydrateForm({
      assistant_id: "a1",
      assistant_name: "Bot",
      assistant_mode: "cascade",
      assistant_stt_model: "deepgram",
      assistant_stt_config: { model: "nova-3", language: "multi", enable_diarization: true, keyterm: "invoice" },
      assistant_llm_config: { provider: "openai", model: "gpt-5-mini", reasoning_effort: "low" },
    });

    expect(hydrated.assistant_stt_config).toEqual({
      model: "nova-3",
      language: "multi",
      enable_diarization: true,
      keyterm: "invoice",
    });
    expect(hydrated.assistant_llm_config).toMatchObject({ model: "gpt-5-mini", reasoning_effort: "low" });
  });

  it("drops masked keys on the way in, so they cannot be sent back", () => {
    const hydrated = hydrateForm({
      assistant_name: "Bot",
      assistant_mode: "pipeline",
      assistant_tts_model: "cartesia",
      assistant_tts_config: { voice_id: "abc", api_key: "car_****" },
    });

    expect(hydrated.assistant_tts_config).toEqual({ voice_id: "abc" });
  });
});
