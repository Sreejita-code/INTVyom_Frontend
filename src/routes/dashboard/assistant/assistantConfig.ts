/**
 * Pure form ⇄ API translation for the assistant editor.
 *
 * Three jobs, none of which touch React:
 *  - `hydrateForm` turns a fetched assistant into form state
 *  - `applyModeChange` / `applySttProvider` / `applyTtsProvider` repair the config when a
 *    selection makes the rest of it unrunnable
 *  - `buildAssistantPayload` turns form state into the create/update body
 *
 * The repairs matter because the API validates the *merged* result: naming a mode that the
 * stored provider cannot run is a 400, so the form fixes the combination at the moment the
 * user changes it rather than letting the save fail.
 */
import { AssistantDetail, AssistantLlmConfig, AssistantMode, SttProvider, TtsProvider } from "@/types/assistant";
import { emptyForm } from "./constants";
import {
  CASCADE_LLM_FIELDS,
  OPENAI_CASCADE_MODELS,
  OPENAI_REALTIME_MODELS,
  PIPELINE_STT_MODELS,
  STT_PROVIDERS,
  TTS_PROVIDERS,
  defaultConfigFor,
  findProvider,
  llmInertReason,
  sttInertReason,
} from "./providerCatalog";

const CASCADE_MODEL_IDS = OPENAI_CASCADE_MODELS.map((m) => m.value);
const REALTIME_MODEL_IDS = OPENAI_REALTIME_MODELS.map((m) => m.value);

// Validation constants for stricter checking
const VALID_LLM_PROVIDERS: Record<AssistantMode, string[]> = {
  pipeline: ["openai"],
  realtime: ["openai", "gemini"],
  cascade: ["openai"]
};

const VALID_STT_PROVIDERS: Record<AssistantMode, string[]> = {
  pipeline: ["sarvam", "native"],
  realtime: ["sarvam", "native", "cartesia", "deepgram", "elevenlabs", "openai"], // All accepted but only sarvam/native run
  cascade: ["sarvam", "cartesia", "deepgram", "elevenlabs", "openai"]
};

const VALID_TTS_PROVIDERS: Record<AssistantMode, string[]> = {
  pipeline: ["cartesia", "sarvam", "elevenlabs", "mistral"],
  realtime: ["cartesia", "sarvam", "elevenlabs", "mistral"], // Stored but ignored
  cascade: ["cartesia", "sarvam", "elevenlabs", "mistral"]
};

/** Config keys the API types as numbers. Selects hand back strings, so they are coerced here. */
const NUMERIC_KEYS = new Set([
  "speed", "volume", "pace", "temperature", "speech_sample_rate",
  "stability", "similarity_boost", "style", "max_output_tokens",
]);

/**
 * Validates if a provider is compatible with the given mode
 */
export const isValidProviderForMode = (mode: AssistantMode, providerType: 'llm' | 'stt' | 'tts', provider: string): boolean => {
  const validProviders = providerType === 'llm' 
    ? VALID_LLM_PROVIDERS 
    : providerType === 'stt' 
    ? VALID_STT_PROVIDERS 
    : VALID_TTS_PROVIDERS;
  
  return validProviders[mode].includes(provider);
};

/**
 * Gets validation error message for incompatible provider/mode combinations
 */
export const getProviderModeError = (mode: AssistantMode, providerType: 'llm' | 'stt' | 'tts', provider: string): string | null => {
  if (isValidProviderForMode(mode, providerType, provider)) {
    return null;
  }
  
  const validProviders = providerType === 'llm' 
    ? VALID_LLM_PROVIDERS 
    : providerType === 'stt' 
    ? VALID_STT_PROVIDERS 
    : VALID_TTS_PROVIDERS;
    
  const providerNames = providerType === 'llm' 
    ? { openai: 'OpenAI', gemini: 'Gemini' }
    : providerType === 'stt'
    ? { sarvam: 'Sarvam', native: 'Native', cartesia: 'Cartesia', deepgram: 'Deepgram', elevenlabs: 'ElevenLabs', openai: 'OpenAI' }
    : { cartesia: 'Cartesia', sarvam: 'Sarvam', elevenlabs: 'ElevenLabs', mistral: 'Mistral' };
  
  const validProviderNames = validProviders[mode].map(p => providerNames[p as keyof typeof providerNames] || p).join(', ');
  
  return `${providerNames[provider as keyof typeof providerNames] || provider} is not valid for ${mode} mode. Valid providers are: ${validProviderNames}.`;
};

/**
 * Validates model ID compatibility with mode
 */
export const isValidModelForMode = (mode: AssistantMode, provider: string, model?: string): boolean => {
  if (!model) return true; // Allow empty models to use defaults
  
  const allowed = mode === "cascade" 
    ? CASCADE_MODEL_IDS 
    : mode === "realtime" && provider === "openai"
    ? REALTIME_MODEL_IDS
    : mode === "pipeline" && provider === "openai"
    ? REALTIME_MODEL_IDS
    : null;
    
  // Gemini models are not validated
  if (provider === "gemini") return true;
  
  return allowed ? allowed.includes(model) : true;
};

/**
 * Gets validation error for model/mode incompatibility
 */
export const getModelModeError = (mode: AssistantMode, provider: string, model?: string): string | null => {
  if (isValidModelForMode(mode, provider, model)) {
    return null;
  }
  
  const allowed = mode === "cascade" 
    ? CASCADE_MODEL_IDS 
    : REALTIME_MODEL_IDS;
    
  return `Model "${model}" is not valid for ${mode} mode with ${provider}. Allowed models: ${allowed.join(', ')}.`;
};

/**
 * Drops keys the API would reject or misread: empty strings (an omitted language means
 * auto-detect on several providers, an empty one does not), and `api_key`.
 *
 * `api_key` is the important one — GET returns every key masked, and sending a masked value
 * back is a 422. The key belongs to the Integrations page; the backend injects the real one.
 * `false` and `0` are kept: both are meaningful values here.
 */
const clean = (config: Record<string, any> | undefined): Record<string, any> => {
  if (!config) return {};
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(config)) {
    if (key === "api_key") continue;
    if (value === undefined || value === null || value === "") continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = clean(value);
      if (Object.keys(nested).length > 0) out[key] = nested;
      continue;
    }
    out[key] = NUMERIC_KEYS.has(key) ? Number(value) : value;
  }
  return out;
};

/**
 * Drops transcriber keys the selected model does not read.
 *
 * The form already greys these out, but greying a control does not remove the value it was holding
 * — switch model and the old key is still in the config, still sent. See `buildAssistantPayload`
 * for why that is not cosmetic.
 */
const pruneStt = (
  provider: string,
  config: AssistantDetail["assistant_stt_config"],
): Record<string, unknown> => {
  const source = { ...(config ?? {}) } as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (sttInertReason(provider, key, source)) continue;
    out[key] = value;
  }
  return out;
};

/** Model IDs are per-mode and the two families are disjoint, so a mode change re-picks one. */
const repairLlmForMode = (llm: AssistantLlmConfig | undefined, mode: AssistantMode): AssistantLlmConfig => {
  const next: AssistantLlmConfig = { ...(llm ?? {}) };
  // Gemini is realtime-only; every other mode needs a text-only response it cannot produce.
  if (mode !== "realtime" && next.provider === "gemini") next.provider = "openai";

  const provider = next.provider || "openai";
  if (provider === "gemini") return next;

  const allowed = mode === "cascade" ? CASCADE_MODEL_IDS : REALTIME_MODEL_IDS;
  if (!next.model || !allowed.includes(next.model)) {
    next.model = mode === "cascade" ? "gpt-4.1" : "gpt-realtime-1.5";
  }
  return next;
};

/**
 * Repairs the LLM config for the mode: provider, and a model that mode can actually run.
 *
 * It deliberately does *not* prune the model-gated generation knobs. `buildAssistantPayload`
 * already drops each one the model rejects, via the same `llmInertReason` the form greys the
 * control with, so pruning here was a second copy of one rule — and the two copies drifted, each
 * carrying its own `/^gpt-5/` regex that misread the `*-chat-latest` aliases. Editing form state
 * also lost the operator's setting: a cascade → pipeline → cascade round trip re-picks gpt-4.1 and
 * would delete a reasoning effort that switching back to a gpt-5 model should restore. Nothing
 * invalid reaches the wire either way — the payload builder is the gate.
 */
export const validateAndRepairLlmConfig = (llm: AssistantLlmConfig | undefined, mode: AssistantMode): AssistantLlmConfig =>
  repairLlmForMode(llm, mode);

export const applyModeChange = (form: AssistantDetail, mode: AssistantMode): AssistantDetail => {
  const next: AssistantDetail = { 
    ...form, 
    assistant_mode: mode, 
    assistant_llm_config: validateAndRepairLlmConfig(form.assistant_llm_config, mode) 
  };

  // `native` means "the realtime model transcribes itself" — cascade has no realtime model.
  if (mode === "cascade" && next.assistant_stt_model === "native") {
    next.assistant_stt_model = "sarvam";
    next.assistant_stt_config = defaultConfigFor(findProvider(STT_PROVIDERS, "sarvam"));
  }

  // Pipeline only ever runs sarvam or native; the rest are replaced by native at call time. The
  // API would accept them, but carrying one through a deliberate mode change would save a setting
  // the call is going to ignore, so switching *into* pipeline repairs it to the default tap. A
  // value that was already stored is left alone — `SttSection` shows it with an explanation
  // instead, so the assistant stays repairable rather than being silently rewritten on open.
  if (mode === "pipeline" && !PIPELINE_STT_MODELS.includes(next.assistant_stt_model)) {
    next.assistant_stt_model = "sarvam";
    next.assistant_stt_config = defaultConfigFor(findProvider(STT_PROVIDERS, "sarvam"));
  }

  // Realtime forces filler words off upstream; mirror it so the form does not show a lie.
  if (mode === "realtime" && next.assistant_interaction_config?.filler_words) {
    next.assistant_interaction_config = { ...next.assistant_interaction_config, filler_words: false };
  }

  return next;
};

/** Switching provider resets the config — one vendor's fields are not valid on another's. */
export const applySttProvider = (form: AssistantDetail, provider: SttProvider): AssistantDetail => ({
  ...form,
  assistant_stt_model: provider,
  assistant_stt_config: defaultConfigFor(findProvider(STT_PROVIDERS, provider)),
});

export const applyTtsProvider = (form: AssistantDetail, provider: TtsProvider): AssistantDetail => ({
  ...form,
  assistant_tts_model: provider,
  assistant_tts_config: defaultConfigFor(findProvider(TTS_PROVIDERS, provider)),
});

/**
 * Fetched assistant → form state. Stored configs are carried over whole rather than reduced to
 * the handful of fields the editor used to know about, so editing a name cannot wipe a knob
 * the form does not render.
 */
export const hydrateForm = (detail: any): AssistantDetail => {
  const mode: AssistantMode = detail.assistant_mode ?? "pipeline";
  const sttModel: SttProvider = detail.assistant_stt_model ?? "sarvam";
  const ttsModel: TtsProvider = detail.assistant_tts_model ?? "cartesia";

  return {
    ...emptyForm,
    ...detail,
    assistant_id: detail.assistant_id,
    assistant_name: detail.assistant_name ?? "",
    assistant_description: detail.assistant_description ?? "",
    assistant_prompt: detail.assistant_prompt ?? "",
    assistant_start_instruction: detail.assistant_start_instruction ?? "",
    assistant_mode: mode,
    assistant_llm_config: clean(detail.assistant_llm_config) as AssistantLlmConfig,
    assistant_stt_model: sttModel,
    assistant_stt_config: clean(detail.assistant_stt_config),
    assistant_tts_model: ttsModel,
    assistant_tts_config: clean(detail.assistant_tts_config),
    assistant_interaction_config: {
      ...emptyForm.assistant_interaction_config,
      ...(detail.assistant_interaction_config ?? {}),
    },
    assistant_greeting_audio: {
      enabled: detail.assistant_greeting_audio?.enabled ?? false,
      audio_id: detail.assistant_greeting_audio?.audio_id ?? "",
    },
  };
};

/**
 * Form state → create/update body.
 *
 * Only fields the selected mode actually reads go out: realtime sends no speech stages, and
 * the cascade generation knobs are dropped outside cascade so a pipeline assistant does not
 * carry settings nothing will read.
 *
 * The same applies within a mode, per model. A knob the chosen model rejects is dropped here —
 * `llmInertReason` and `sttInertReason` decide which, and the form greys out exactly what this
 * drops, so the editor and the wire cannot disagree. They used to: the sections greyed a stale
 * knob while this function kept sending it.
 */
export const buildAssistantPayload = (form: AssistantDetail): Record<string, any> => {
  const mode = form.assistant_mode;
  const isRealtime = mode === "realtime";
  const isCascade = mode === "cascade";

  // Validate provider compatibility before building payload
  const llmError = getProviderModeError(mode, 'llm', form.assistant_llm_config?.provider || "openai");
  if (llmError) {
    console.warn(`LLM Configuration Warning: ${llmError}`);
  }
  
  const llm = validateAndRepairLlmConfig(form.assistant_llm_config, mode);
  const llmConfig: Record<string, any> = {
    provider: llm.provider || "openai",
  };
  if (llm.model?.trim()) {
    const modelError = getModelModeError(mode, llm.provider || "openai", llm.model);
    if (modelError) {
      console.warn(`Model Configuration Warning: ${modelError}`);
    }
    llmConfig.model = llm.model.trim();
  }
  if (isRealtime && llm.voice?.trim()) llmConfig.voice = llm.voice.trim();
  if (isCascade) {
    for (const spec of CASCADE_LLM_FIELDS) {
      // A knob this model rejects is dropped rather than sent. `reasoning_effort` on a non-reasoning
      // model — which a cascade → pipeline → cascade round trip produces on its own, since coming
      // back re-picks gpt-4.1 while the stored effort survives — is a 400 on every turn, so the
      // assistant answers the call and never speaks. The form greys the same keys.
      if (llmInertReason(spec.key, llm.model)) continue;
      const value = (llm as Record<string, any>)[spec.key];
      if (value !== undefined && value !== null && value !== "") {
        llmConfig[spec.key] = NUMERIC_KEYS.has(spec.key) ? Number(value) : value;
      }
    }
  }

  const payload: Record<string, any> = {
    assistant_name: form.assistant_name.trim(),
    assistant_description: form.assistant_description.trim(),
    assistant_prompt: form.assistant_prompt.trim(),
    assistant_mode: mode,
    assistant_start_instruction: form.assistant_start_instruction.trim(),
    assistant_llm_config: llmConfig,
    assistant_interaction_config: {
      ...form.assistant_interaction_config,
      ...(isRealtime ? { filler_words: false } : {}),
    },
    assistant_end_call_enabled: form.assistant_end_call_enabled ?? false,
    assistant_end_call_trigger_phrase: form.assistant_end_call_trigger_phrase?.trim() || "",
    assistant_end_call_agent_message: form.assistant_end_call_agent_message?.trim() || "",
    assistant_end_call_url: form.assistant_end_call_url?.trim() || "",
    assistant_greeting_audio: {
      enabled: form.assistant_greeting_audio?.enabled ?? false,
      audio_id: form.assistant_greeting_audio?.audio_id ?? "",
    },
  };

  if (!isRealtime) {
    // Validate STT provider compatibility
    const sttError = getProviderModeError(mode, 'stt', form.assistant_stt_model);
    if (sttError) {
      console.warn(`STT Configuration Warning: ${sttError}`);
    }
    
    payload.assistant_tts_model = form.assistant_tts_model;
    payload.assistant_tts_config = clean(form.assistant_tts_config);
    payload.assistant_stt_model = form.assistant_stt_model;
    // `native` takes no config at all; anything else would be an unknown-key 422.
    payload.assistant_stt_config =
      form.assistant_stt_model === "native"
        ? {}
        : clean(pruneStt(form.assistant_stt_model, form.assistant_stt_config));
  } else {
    // Even in realtime mode, validate that stored configs won't cause issues
    const sttError = getProviderModeError(mode, 'stt', form.assistant_stt_model);
    if (sttError) {
      console.warn(`STT Configuration Warning (Realtime Mode): ${sttError}`);
    }
  }

  // Validate TTS provider compatibility (except in realtime where it's ignored)
  if (!isRealtime) {
    const ttsError = getProviderModeError(mode, 'tts', form.assistant_tts_model);
    if (ttsError) {
      console.warn(`TTS Configuration Warning: ${ttsError}`);
    }
  }

  return payload;
};
