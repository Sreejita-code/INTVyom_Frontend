import { AssistantDetail } from "@/types/assistant";

// BCP-47 codes Sarvam supports. One list drives all three language surfaces: the STT
// language select, the TTS target_language_code select, and the preferred-languages picker.
// Keep them in sync — a code offered for speech-in should be offered for speech-out.
export const LANGUAGE_CODES = [
  "en-IN",
  "en-US",
  "hi-IN",
  "bn-IN",
  "ta-IN",
  "te-IN",
  "mr-IN",
  "gu-IN",
  "kn-IN",
  "ml-IN",
  "pa-IN",
  "od-IN",
] as const;

// OpenAI chat models known to work in cascade mode. The model is free-form upstream —
// these are the tested ones; anything else fails at the first API call, not at save time.
export const CASCADE_LLM_MODELS = [
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5.1",
  "gpt-5.2",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gpt-5.5",
  "chatgpt-4o-latest",
] as const;

export const STT_MODE_DESCRIPTIONS: Record<string, string> = {
  codemix: "Code-mixed output — English words stay English, Indic words in native script. Best for Hinglish/Tanglish calls.",
  transcribe: "Standard transcription in the spoken language, with proper formatting and normalized numbers.",
  translate: "Transcribes the speech and translates it to English.",
  verbatim: "Word-for-word transcription — keeps filler words and spoken numbers as-is.",
  translit: "Romanized output in Latin script (e.g. \"mera phone number hai 9840950950\").",
};

export const emptyForm: AssistantDetail = {
  assistant_name: "",
  assistant_description: "",
  assistant_prompt: "",
  assistant_mode: "realtime",
  assistant_llm_config: {
    provider: "openai",
    model: "",
    voice: "",
  },
  assistant_tts_model: "cartesia",
  assistant_tts_config: {
    voice_id: "",
    target_language_code: "hi-IN",
  },
  assistant_stt_model: "sarvam",
  assistant_stt_config: {
    model: "saaras:v3",
    language: "unknown",
    mode: "codemix",
  },
  assistant_start_instruction: "",
  // Defaults mirror the backend's own defaults so a freshly created assistant behaves the
  // same whether or not the form was touched.
  assistant_interaction_config: {
    speaks_first: true,
    filler_words: false,
    silence_reprompts: false,
    silence_reprompt_interval: 10.0,
    silence_max_reprompts: 2,
    background_sound_enabled: true,
    thinking_sound_enabled: true,
    allow_interruptions: false,
    input_guard_window_sec: 3.0,
    max_call_duration_minutes: null,
    preferred_languages: ["en-US", "hi-IN"],
  },
  assistant_end_call_enabled: false,
  assistant_end_call_trigger_phrase: "",
  assistant_end_call_agent_message: "",
  assistant_end_call_url: "",
  assistant_greeting_audio: { enabled: false, audio_id: "" },
};

export const buildFormSnapshot = (form: AssistantDetail) =>
  JSON.stringify({
    assistant_name: form.assistant_name.trim(),
    assistant_description: form.assistant_description.trim(),
    assistant_prompt: form.assistant_prompt.trim(),
    assistant_mode: form.assistant_mode,
    assistant_llm_config: {
      provider: form.assistant_llm_config?.provider?.trim() || "gemini",
      model: form.assistant_llm_config?.model?.trim() || "",
      voice: form.assistant_llm_config?.voice?.trim() || "",
    },
    assistant_tts_model: form.assistant_tts_model,
    assistant_tts_config: {
      voice_id: form.assistant_tts_config.voice_id || "",
      target_language_code: form.assistant_tts_config.target_language_code || "",
    },
    assistant_stt_model: form.assistant_stt_model,
    assistant_stt_config: {
      model: form.assistant_stt_config.model || "",
      language: form.assistant_stt_config.language || "",
      mode: form.assistant_stt_config.mode || "",
    },
    assistant_start_instruction: form.assistant_start_instruction.trim(),
    assistant_interaction_config: {
      speaks_first: form.assistant_interaction_config?.speaks_first ?? true,
      filler_words: form.assistant_interaction_config?.filler_words ?? false,
      silence_reprompts: form.assistant_interaction_config?.silence_reprompts ?? false,
      silence_reprompt_interval: form.assistant_interaction_config?.silence_reprompt_interval ?? 10.0,
      silence_max_reprompts: form.assistant_interaction_config?.silence_max_reprompts ?? 2,
      background_sound_enabled: form.assistant_interaction_config?.background_sound_enabled ?? true,
      thinking_sound_enabled: form.assistant_interaction_config?.thinking_sound_enabled ?? true,
      allow_interruptions: form.assistant_interaction_config?.allow_interruptions ?? false,
      input_guard_window_sec: form.assistant_interaction_config?.input_guard_window_sec ?? 3.0,
      max_call_duration_minutes: form.assistant_interaction_config?.max_call_duration_minutes ?? null,
      preferred_languages: form.assistant_interaction_config?.preferred_languages ?? [],
    },
    assistant_end_call_enabled: form.assistant_end_call_enabled ?? false,
    assistant_end_call_trigger_phrase: form.assistant_end_call_trigger_phrase?.trim() || "",
    assistant_end_call_agent_message: form.assistant_end_call_agent_message?.trim() || "",
    assistant_end_call_url: form.assistant_end_call_url?.trim() || "",
    assistant_greeting_audio: {
      enabled: form.assistant_greeting_audio?.enabled ?? false,
      audio_id: form.assistant_greeting_audio?.audio_id ?? "",
    },
  });
