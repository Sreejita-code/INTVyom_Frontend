export type AssistantMode = "pipeline" | "realtime" | "cascade";

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

export interface AssistantDetail {
  assistant_id?: string;
  assistant_name: string;
  assistant_description: string;
  assistant_prompt: string;
  assistant_mode: AssistantMode;
  assistant_llm_config?: {
    provider?: string;
    model?: string;
    voice?: string;
  };
  assistant_tts_model: "cartesia" | "sarvam" | "elevenlabs" | "mistral";
  assistant_tts_config: {
    voice_id?: string;
    target_language_code?: string;
  };
  assistant_stt_model: "sarvam" | "native" | "cartesia";
  assistant_stt_config: {
    model?: string;
    language?: string;
    mode?: string;
  };
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
  assistant_greeting_audio?: {
    enabled: boolean;
    audio_id: string;
  };
}

export interface AssistantCallLogsPage {
  logs: unknown[];
  totalPages: number;
  total: number;
}

export interface WebCallTokenPayload {
  token?: string;
}
