import type { CallLog } from "./callLog";

export type AssistantMode = "pipeline" | "realtime" | "cascade" | "duplex";

export type TtsProvider = "cartesia" | "sarvam" | "elevenlabs" | "mistral";

/**
 * `native` is pipeline-only — there is no realtime model in cascade to transcribe itself.
 * The other four are cascade providers; pipeline stores the selection and transcribes
 * natively for the call, so switching to cascade later needs no second edit.
 */
export type SttProvider = "sarvam" | "native" | "cartesia" | "deepgram" | "elevenlabs" | "openai";

export interface AssistantItem {
  assistant_id: string;
  assistant_name: string;
  assistant_mode?: AssistantMode;
  assistant_llm_config?: Record<string, any>;
  assistant_created_at?: string;
  _id?: string;
  name?: string;
  description?: string;
}

export interface AssistantSummary {
  assistant_id: string;
  assistant_name: string;
  assistant_mode?: AssistantMode;
}

/**
 * The LLM block. `provider`, `model` and `voice` apply everywhere; the generation knobs below
 * them are stored in every mode but only read in cascade and duplex (where they are checked
 * against `backend_model`, and `temperature` is rejected).
 */
export interface AssistantLlmConfig {
  provider?: string;
  model?: string;
  voice?: string;
  temperature?: number;
  max_output_tokens?: number;
  reasoning_effort?: string;
  service_tier?: string;
  verbosity?: string;
  tool_choice?: string;
  parallel_tool_calls?: boolean;
  /** Duplex only: the reasoning model GPT-Live hands reasoning and tool calls to. */
  backend_model?: string;
  /** Duplex only: instructions for the backend model, up to 4000 characters. */
  backend_instructions?: string;
}

/** Union of all four providers' TTS fields — which ones are valid depends on the provider. */
export interface AssistantTtsConfig {
  // cartesia, elevenlabs, mistral
  voice_id?: string;
  // sarvam
  speaker?: string;
  target_language_code?: string;
  pace?: number;
  speech_sample_rate?: number;
  temperature?: number;
  // cartesia
  language?: string;
  speed?: number;
  volume?: number;
  emotion?: string;
  pronunciation_dict_id?: string;
  // elevenlabs
  model?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    speed?: number;
    use_speaker_boost?: boolean;
  };
}

/** Union of all five STT providers' fields. `native` takes none. */
export interface AssistantSttConfig {
  model?: string;
  // sarvam, cartesia, deepgram, openai
  language?: string;
  // sarvam
  mode?: string;
  // deepgram
  enable_diarization?: boolean;
  /** One term, or a list; the backend accepts either. */
  keyterm?: string | string[];
  // elevenlabs
  language_code?: string;
  no_verbatim?: boolean;
  // openai
  detect_language?: boolean;
  prompt?: string;
  noise_reduction_type?: string;
  use_realtime?: boolean;
}

/**
 * Delivery tuning for the end-call webhook. Upstream merges this object key by key, so a null (or
 * omitted) value means "fall back to the server default" — 30s timeout, 3 attempts.
 */
export interface EndCallWebhookTuning {
  timeout_seconds?: number | null;
  attempts?: number | null;
}

export interface AssistantDetail {
  assistant_id?: string;
  assistant_name: string;
  assistant_description: string;
  assistant_prompt: string;
  assistant_mode: AssistantMode;
  assistant_llm_config?: AssistantLlmConfig;
  assistant_tts_model: TtsProvider;
  assistant_tts_config: AssistantTtsConfig;
  assistant_stt_model: SttProvider;
  assistant_stt_config: AssistantSttConfig;
  assistant_start_instruction: string;
  assistant_interaction_config?: {
    speaks_first?: boolean;
    filler_words?: boolean;
    silence_reprompts?: boolean;
    silence_reprompt_interval?: number;
    silence_max_reprompts?: number;
    background_sound_enabled?: boolean;
    thinking_sound_enabled?: boolean;
    allow_interruptions?: boolean;
    input_guard_window_sec?: number;
    max_call_duration_minutes?: number | null;
    preferred_languages?: string[];
  };
  assistant_end_call_enabled?: boolean;
  assistant_end_call_trigger_phrase?: string;
  assistant_end_call_agent_message?: string;
  assistant_end_call_url?: string;
  assistant_end_call_webhook?: EndCallWebhookTuning;
  assistant_greeting_audio?: {
    enabled: boolean;
    audio_id: string;
  };
}

export interface AssistantCallLogsPage {
  logs: CallLog[];
  totalPages: number;
  total: number;
}

export interface WebCallTokenPayload {
  token?: string;
}

/** One step of the guided builder. `id` is one of mode, llm, tts, stt, interaction, advanced. */
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  /** The create fields this step fills in. */
  fields: string[];
}

export interface WizardFieldRule {
  required: boolean;
  allowedValues: string[];
}

export interface WizardStepDetail extends WizardStep {
  rules: Record<string, WizardFieldRule>;
  /** Provider hints for the draft's mode. */
  providers: { value: string; label: string; description: string }[];
}

export interface WizardNavigation {
  next: WizardStep | null;
  previous: WizardStep | null;
}

/** Step id to completed. Steps the draft's mode does not run are absent or false. */
export type WizardStatus = Record<string, boolean>;

export interface WizardStepValidation {
  isValid: boolean;
  errors: string[];
}
