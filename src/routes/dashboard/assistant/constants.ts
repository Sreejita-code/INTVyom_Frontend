import { AssistantDetail } from "@/types/assistant";

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
    language: "en",
    speed: 1,
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
    // Empty, matching the backend schema default. This used to seed ["en-US", "hi-IN"], which
    // was not a backend default at all — every untouched assistant then carried a preferred
    // list, and the engine used to read its first entry as the STT language. That is fixed
    // upstream too, but a default nobody chose still does not belong here.
    preferred_languages: [],
  },
  assistant_end_call_enabled: false,
  assistant_end_call_trigger_phrase: "",
  assistant_end_call_agent_message: "",
  assistant_end_call_url: "",
  assistant_greeting_audio: { enabled: false, audio_id: "" },
};

/**
 * Serialize with sorted keys, so the unsaved-changes check compares values rather than the
 * order they happened to be written in. Setting a knob and setting it back reads as clean.
 */
const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (val as Record<string, unknown>)[k];
          return acc;
        }, {});
    }
    return val;
  });

/**
 * Snapshot of everything the editor can change. `assistant_id` is excluded — selecting a
 * different assistant replaces the whole form, it is not an edit to this one.
 */
export const buildFormSnapshot = (form: AssistantDetail) => {
  const { assistant_id, ...editable } = form;
  return stableStringify(editable);
};
