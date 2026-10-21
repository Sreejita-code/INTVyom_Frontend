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
import { AssistantDetail, AssistantLlmConfig, AssistantMode, EndCallWebhookTuning, SttProvider, TtsProvider } from "@/types/assistant";
import { END_CALL_WEBHOOK_FIELDS, emptyForm } from "./constants";
import {
  CASCADE_LLM_FIELDS,
  GEMINI_KNOB_KEYS,
  DUPLEX_BACKEND_MODELS,
  DUPLEX_BACKEND_INSTRUCTIONS_MAX,
  DUPLEX_DEFAULT_BACKEND_MODEL,
  DUPLEX_DEFAULT_VOICE,
  DUPLEX_MODEL,
  DUPLEX_VOICES,
  ELEVENLABS_VOICE_SETTINGS,
  GEMINI_DEFAULT_MODEL,
  GEMINI_DEFAULT_VOICE,
  OPENAI_CASCADE_MODELS,
  OPENAI_REALTIME_MODELS,
  OPENAI_REALTIME_VOICES,
  PIPELINE_STT_MODELS,
  RETIRED_OPENAI_MODELS,
  SARVAM_TTS_LIMITS,
  STT_PROVIDERS,
  TTS_PROVIDERS,
  defaultConfigFor,
  elevenLabsReadsSetting,
  findProvider,
  isGeminiModel,
  isGeminiVoice,
  llmInertReason,
  sarvamTtsModelOf,
  sttInertReason,
} from "./providerCatalog";

const CASCADE_MODEL_IDS = OPENAI_CASCADE_MODELS.map((m) => m.value);
const REALTIME_MODEL_IDS = OPENAI_REALTIME_MODELS.map((m) => m.value);
const DUPLEX_BACKEND_MODEL_IDS = DUPLEX_BACKEND_MODELS.map((m) => m.value);
const DUPLEX_VOICE_IDS = DUPLEX_VOICES.map((v) => v.value);
const OPENAI_REALTIME_VOICE_IDS = OPENAI_REALTIME_VOICES.map((v) => v.value);

/** The model whose capabilities the generation knobs are checked against. */
export const knobModelFor = (mode: AssistantMode, llm: AssistantLlmConfig | undefined): string | undefined =>
  mode === "duplex" ? llm?.backend_model?.trim() || DUPLEX_DEFAULT_BACKEND_MODEL : llm?.model;

// Validation constants for stricter checking
const VALID_LLM_PROVIDERS: Record<AssistantMode, string[]> = {
  pipeline: ["openai"],
  realtime: ["openai", "gemini"],
  cascade: ["openai"],
  duplex: ["openai"],
};

const VALID_STT_PROVIDERS: Record<AssistantMode, string[]> = {
  pipeline: ["sarvam", "native"],
  realtime: ["sarvam", "native", "cartesia", "deepgram", "elevenlabs", "openai"], // All accepted but only sarvam/native run
  cascade: ["sarvam", "cartesia", "deepgram", "elevenlabs", "openai"],
  duplex: ["sarvam", "native", "cartesia", "deepgram", "elevenlabs", "openai"], // Stored but ignored
};

const VALID_TTS_PROVIDERS: Record<AssistantMode, string[]> = {
  pipeline: ["cartesia", "sarvam", "elevenlabs", "mistral"],
  realtime: ["cartesia", "sarvam", "elevenlabs", "mistral"], // Stored but ignored
  cascade: ["cartesia", "sarvam", "elevenlabs", "mistral"],
  duplex: ["cartesia", "sarvam", "elevenlabs", "mistral"], // Stored but ignored
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
    : mode === "duplex"
    ? [DUPLEX_MODEL]
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
  
  const replacement = model ? RETIRED_OPENAI_MODELS[model] : undefined;
  if (replacement) {
    return `${model} is retired and the API rejects it. Use ${replacement}.`;
  }

  const allowed = mode === "cascade" 
    ? CASCADE_MODEL_IDS 
    : mode === "duplex"
    ? [DUPLEX_MODEL]
    : REALTIME_MODEL_IDS;
    
  return `Model "${model}" is not valid for ${mode} mode with ${provider}. Allowed models: ${allowed.join(', ')}.`;
};

/** Duplex hands reasoning and tools to `backend_model`, which must be a current reasoning model. */
export const getBackendModelError = (model?: string): string | null => {
  if (!model) return null;
  const replacement = RETIRED_OPENAI_MODELS[model];
  if (replacement) return `${model} is retired and the API rejects it. Use ${replacement}.`;
  return DUPLEX_BACKEND_MODEL_IDS.includes(model)
    ? null
    : `Backend model "${model}" is not a reasoning model duplex can use. Allowed models: ${DUPLEX_BACKEND_MODEL_IDS.join(', ')}.`;
};

export const getBackendInstructionsError = (instructions?: string): string | null =>
  instructions && instructions.length > DUPLEX_BACKEND_INSTRUCTIONS_MAX
    ? `Backend instructions are ${instructions.length} characters; the limit is ${DUPLEX_BACKEND_INSTRUCTIONS_MAX}.`
    : null;

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

const repairGeminiLlm = (llm: AssistantLlmConfig): AssistantLlmConfig => ({
  ...llm,
  model: isGeminiModel(llm.model) ? llm.model : GEMINI_DEFAULT_MODEL,
  voice: llm.voice && isGeminiVoice(llm.voice) ? llm.voice : GEMINI_DEFAULT_VOICE,
});

/** Model IDs are per-mode and the two families are disjoint, so a mode change re-picks one. */
const repairLlmForMode = (llm: AssistantLlmConfig | undefined, mode: AssistantMode): AssistantLlmConfig => {
  const next: AssistantLlmConfig = { ...(llm ?? {}) };

  if (mode === "duplex") {
    // The API replaces the stored config on a switch into duplex, because no model id is valid in
    // both families, so everything here is rebuilt rather than carried over. `temperature` is a
    // 400: every backend model is a reasoning model.
    delete next.temperature;
    return {
      ...next,
      provider: "openai",
      model: DUPLEX_MODEL,
      voice: next.voice && DUPLEX_VOICE_IDS.includes(next.voice) ? next.voice : DUPLEX_DEFAULT_VOICE,
      backend_model: next.backend_model || DUPLEX_DEFAULT_BACKEND_MODEL,
    };
  }

  // backend_model and backend_instructions are rejected outside duplex.
  delete next.backend_model;
  delete next.backend_instructions;

  // Gemini is realtime-only; every other mode needs a text-only response it cannot produce.
  if (mode !== "realtime" && next.provider === "gemini") next.provider = "openai";

  const provider = next.provider || "openai";
  if (provider === "gemini") {
    return repairGeminiLlm(next);
  }

  const allowed = mode === "cascade" ? CASCADE_MODEL_IDS : REALTIME_MODEL_IDS;
  if (!next.model || !allowed.includes(next.model)) {
    next.model = mode === "cascade" ? "gpt-4.1" : "gpt-realtime-1.5";
  }
  if (next.voice && isGeminiVoice(next.voice)) {
    next.voice = "marin";
  }
  // A voice only GPT-Live has — left over from duplex — is not an OpenAI realtime voice.
  if (next.voice && DUPLEX_VOICE_IDS.includes(next.voice) && !OPENAI_REALTIME_VOICE_IDS.includes(next.voice)) {
    next.voice = "marin";
  }
  return next;
};

/**
 * Repairs the LLM config for the mode: provider, and a model that mode can actually run.
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

  if (mode === "pipeline" && !PIPELINE_STT_MODELS.includes(next.assistant_stt_model)) {
    next.assistant_stt_model = "sarvam";
    next.assistant_stt_config = defaultConfigFor(findProvider(STT_PROVIDERS, "sarvam"));
  }

  // Realtime forces filler words off upstream; mirror it so the form does not show a lie. Duplex
  // refuses them outright (400), so they are switched off here for the same reason.
  if ((mode === "realtime" || mode === "duplex") && next.assistant_interaction_config?.filler_words) {
    next.assistant_interaction_config = { ...next.assistant_interaction_config, filler_words: false };
  }

  // GPT-Live cannot speak a fixed string, so an enabled recording is a 400 on duplex.
  if (mode === "duplex" && next.assistant_greeting_audio?.enabled) {
    next.assistant_greeting_audio = { ...next.assistant_greeting_audio, enabled: false };
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

export const normalizeEndCallWebhook = (
  webhook: EndCallWebhookTuning | undefined,
): Required<EndCallWebhookTuning> => ({
  timeout_seconds: webhook?.timeout_seconds ?? null,
  attempts: webhook?.attempts ?? null,
});

/** Per-field problems with the webhook tuning, matching the backend's integer ranges. */
export const endCallWebhookErrors = (
  webhook: EndCallWebhookTuning | undefined,
): Partial<Record<keyof EndCallWebhookTuning, string>> => {
  const errors: Partial<Record<keyof EndCallWebhookTuning, string>> = {};
  for (const { key, name, min, max } of END_CALL_WEBHOOK_FIELDS) {
    const value = webhook?.[key];
    if (value == null) continue;
    if (!Number.isInteger(value)) errors[key] = `${name} must be a whole number.`;
    else if (value < min || value > max) errors[key] = `${name} must be between ${min} and ${max}.`;
  }
  return errors;
};

export const endCallWebhookError = (webhook: EndCallWebhookTuning | undefined): string | null =>
  Object.values(endCallWebhookErrors(webhook))[0] ?? null;

const hydrateLlm = (llm: AssistantLlmConfig): AssistantLlmConfig =>
  llm.provider === "gemini" ? repairGeminiLlm(llm) : llm;

/**
 * Fetched assistant → form state.
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
    assistant_llm_config: hydrateLlm(clean(detail.assistant_llm_config) as AssistantLlmConfig),
    assistant_stt_model: sttModel,
    assistant_stt_config: clean(detail.assistant_stt_config),
    assistant_tts_model: ttsModel,
    assistant_tts_config: clean(detail.assistant_tts_config),
    assistant_interaction_config: {
      ...emptyForm.assistant_interaction_config,
      ...(detail.assistant_interaction_config ?? {}),
    },
    assistant_end_call_webhook: normalizeEndCallWebhook(detail.assistant_end_call_webhook),
    assistant_greeting_audio: {
      enabled: detail.assistant_greeting_audio?.enabled ?? false,
      audio_id: detail.assistant_greeting_audio?.audio_id ?? "",
    },
  };
};

/**
 * Drops TTS keys the selected model does not read.
 * e.g., ElevenLabs eleven_v3 model has no speed control.
 */
const pruneTts = (
  provider: string,
  config: AssistantDetail["assistant_tts_config"],
): Record<string, unknown> => {
  const source = clean(config);
  if (provider === "elevenlabs" && source.voice_settings) {
    const model = typeof source.model === "string" ? source.model : undefined;
    const vs = { ...(source.voice_settings as Record<string, unknown>) };
    for (const key of ELEVENLABS_VOICE_SETTINGS) {
      if (!elevenLabsReadsSetting(model, key)) delete vs[key];
    }
    if (Object.keys(vs).length > 0) {
      source.voice_settings = vs;
    } else {
      delete source.voice_settings;
    }
  }
  if (provider === "sarvam" && sarvamTtsModelOf(source) === "bulbul:v4-flash") {
    // Sarvam fixes temperature at 0.6 on v4-flash, and the API rejects a value.
    delete source.temperature;
  }
  return source;
};

/**
 * Repairs a Sarvam config after the user changes `model`.
 *
 * The two Bulbul models share no speakers, and differ in pace range, sample rates and language
 * set, so a switch that kept the old values would save into a 400. Anything the new model cannot
 * take is replaced by a value it can.
 */
export const repairTtsConfig = (
  provider: string,
  previous: Record<string, unknown> | undefined,
  next: Record<string, unknown>,
): Record<string, unknown> => {
  if (provider !== "sarvam" || sarvamTtsModelOf(previous) === sarvamTtsModelOf(next)) return next;

  const model = sarvamTtsModelOf(next);
  const limits = SARVAM_TTS_LIMITS[model];
  const repaired: Record<string, unknown> = { ...next, speaker: limits.defaultSpeaker };
  const { pace, speech_sample_rate: sampleRate, target_language_code: language } = repaired;
  if (typeof pace === "number") {
    repaired.pace = Math.min(limits.pace.max, Math.max(limits.pace.min, pace));
  }
  if (sampleRate !== undefined && !limits.sampleRates.includes(Number(sampleRate))) {
    repaired.speech_sample_rate = 24000;
  }
  if (typeof language === "string" && !limits.languages.includes(language)) {
    repaired.target_language_code = "en-IN";
  }
  if (model === "bulbul:v4-flash") delete repaired.temperature;
  return repaired;
};

/** Recursively removes `null` values. Empty objects, `false` and `""` all survive — only null goes. */
const dropNulls = (value: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === null) continue;
    out[key] =
      item && typeof item === "object" && !Array.isArray(item)
        ? dropNulls(item as Record<string, unknown>)
        : item;
  }
  return out;
};

/**
 * Form state → create/update body.
 *
 * Explicitly sends `null` for inert or model-rejected knobs (e.g. temperature on reasoning models,
 * voice in pipeline/cascade) so backend key-by-key dictionary merging clears stored invalid keys.
 *
 * Those nulls only mean something on update. Pass `creating` and they are stripped: a create has no
 * stored document to clear, so a null there is noise in the request a developer reads first.
 */
export const buildAssistantPayload = (
  form: AssistantDetail,
  hasTools?: boolean,
  { creating = false }: { creating?: boolean } = {},
): Record<string, any> => {
  const mode = form.assistant_mode;
  const isRealtime = mode === "realtime";
  const isCascade = mode === "cascade";
  const isDuplex = mode === "duplex";
  // Realtime and duplex both speak for themselves, so neither runs a TTS or STT stage.
  const speaksItself = isRealtime || isDuplex;

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

  if (speaksItself) {
    if (llm.voice?.trim()) {
      if (llm.provider === "openai" && isGeminiVoice(llm.voice)) {
        llmConfig.voice = "marin";
      } else {
        llmConfig.voice = llm.voice.trim();
      }
    } else {
      llmConfig.voice = null;
    }
  } else {
    // Explicit null clears stored voice in DB when mode is not realtime
    llmConfig.voice = null;
  }

  if (isDuplex) {
    llmConfig.backend_model = llm.backend_model?.trim() || DUPLEX_DEFAULT_BACKEND_MODEL;
    // Empty on update is an explicit null so a cleared field clears the stored instructions.
    llmConfig.backend_instructions = llm.backend_instructions?.trim() || null;
  }

  if (isCascade || isDuplex) {
    const toolsPresent = hasTools ?? (form.assistant_end_call_enabled ?? false);
    const knobModel = knobModelFor(mode, llm);
    for (const spec of CASCADE_LLM_FIELDS) {
      const value = (llm as Record<string, any>)[spec.key];
      const inert = llmInertReason(spec.key, knobModel, toolsPresent, value);
      if (inert) {
        // Explicit null clears stored inert knob in DB on backend update!
        llmConfig[spec.key] = null;
      } else if (value !== undefined && value !== null && value !== "") {
        llmConfig[spec.key] = NUMERIC_KEYS.has(spec.key) ? Number(value) : value;
      } else {
        llmConfig[spec.key] = null;
      }
    }
  } else {
    // In the other modes, explicitly clear the generation knobs. Gemini realtime refuses five of
    // them (400), so a stored one is cleared with null; the two it reads are sent as set.
    const keeps = isRealtime && llm.provider === "gemini" ? GEMINI_KNOB_KEYS : [];
    for (const spec of CASCADE_LLM_FIELDS) {
      const value = (llm as Record<string, unknown>)[spec.key];
      const set = keeps.includes(spec.key) && value !== undefined && value !== null && value !== "";
      llmConfig[spec.key] = set ? (NUMERIC_KEYS.has(spec.key) ? Number(value) : value) : null;
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
      ...(speaksItself ? { filler_words: false } : {}),
    },
    assistant_end_call_enabled: form.assistant_end_call_enabled ?? false,
    assistant_end_call_trigger_phrase: form.assistant_end_call_trigger_phrase?.trim() || "",
    assistant_end_call_agent_message: form.assistant_end_call_agent_message?.trim() || "",
    assistant_end_call_url: form.assistant_end_call_url?.trim() || "",
    assistant_greeting_audio: {
      enabled: isDuplex ? false : (form.assistant_greeting_audio?.enabled ?? false),
      audio_id: form.assistant_greeting_audio?.audio_id ?? "",
    },
  };

  // Upstream merges the webhook object key by key; `null` means "server default". On update the
  // nulls are sent so a cleared field really clears. On create there is nothing to clear, so an
  // untuned webhook is omitted rather than sent as `{}`.
  const webhook = normalizeEndCallWebhook(
    form.assistant_end_call_url?.trim() ? form.assistant_end_call_webhook : undefined,
  );
  if (creating === false || webhook.timeout_seconds != null || webhook.attempts != null) {
    payload.assistant_end_call_webhook = webhook;
  }

  if (!speaksItself) {
    // Validate STT provider compatibility
    const sttError = getProviderModeError(mode, 'stt', form.assistant_stt_model);
    if (sttError) {
      console.warn(`STT Configuration Warning: ${sttError}`);
    }
    
    payload.assistant_tts_model = form.assistant_tts_model;
    payload.assistant_tts_config = pruneTts(form.assistant_tts_model, form.assistant_tts_config);
    payload.assistant_stt_model = form.assistant_stt_model;
    // `native` takes no config at all; anything else would be an unknown-key 422.
    payload.assistant_stt_config =
      form.assistant_stt_model === "native"
        ? {}
        : clean(pruneStt(form.assistant_stt_model, form.assistant_stt_config));
  } else {
    // In Realtime and Duplex mode, STT & TTS stages are not used.
    // ponytail: empty objects, not null — backend reads config.language unconditionally
    // and crashes on null ("Cannot read properties of null (reading 'language')").
    payload.assistant_tts_model = null;
    payload.assistant_tts_config = {};
    payload.assistant_stt_model = null;
    payload.assistant_stt_config = {};
  }

  return creating ? dropNulls(payload) : payload;
};
