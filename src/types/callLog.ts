export interface CallTranscript {
  speaker?: string;
  text?: string;
  timestamp?: string;
}

export interface CallUsageLine {
  /** `llm`, `tts`, `stt`. Duplex's `voice_llm_usage` and `backend_llm_usage` are both `llm`, told apart by `role`. */
  type: string;
  /** Duplex calls recorded from upstream 1.7.0 only: GPT-Live (`voice`) or its backend model (`backend`). */
  role?: "voice" | "backend";
  provider: string;
  model: string;
  estimatedCostUsd: number | null;
  inputTokens?: number;
  outputTokens?: number;
  charactersCount?: number;
  audioDuration?: number;
  /** Seconds the session was open; what GPT-Live (duplex) is billed on. */
  sessionDuration?: number;
}

export interface CallUsage {
  estimatedCostUsd: number | null;
  pricingComplete: boolean;
  usageFinalized: boolean;
  lines: CallUsageLine[];
}

export interface CallLog {
  started_at: string;
  to_number?: string;
  platform_number?: string | null;
  call_type?: string;
  call_service?: string | null;
  is_passthrough?: boolean;
  call_status?: string;
  call_status_reason?: string | null;
  sip_status_code?: number | null;
  sip_status_text?: string | null;
  answered_at?: string | null;
  ended_at?: string | null;
  call_duration_minutes?: number;
  recording_path?: string | null;
  transcripts?: CallTranscript[];
  metadata?: Record<string, unknown>;
  usage: CallUsage | null;
}
