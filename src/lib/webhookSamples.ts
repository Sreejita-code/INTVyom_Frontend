/**
 * Example bodies the backend POSTs to a user-supplied webhook URL.
 *
 * Transcribed from the API docs (`api/calls/webhook.md`, `api/calls/passthrough.md`) so the
 * form that asks for the URL can also show what will arrive at it. Data only — nothing here
 * is read at runtime, and a field added by the backend has to be added here by hand.
 *
 * The numbers are internally consistent on purpose — a developer sizing token math against a
 * sample should not have to notice that the docs page's own example does not add up.
 */

interface WebhookSample {
  id: string;
  label: string;
  value: unknown;
}

const callRecord = (overrides: Record<string, unknown>) => ({
  success: true,
  message: "Call details fetched successfully",
  data: {
    room_name: "550e8400-e29b-41d4-a716-446655440000_abc123",
    queue_id: "8b7df5ea0fdc497ea4f44bd31954a387",
    assistant_id: "550e8400-e29b-41d4-a716-446655440000",
    assistant_name: "Support Agent",
    is_passthrough: false,
    to_number: "+15550200000",
    call_status: "completed",
    call_status_reason: null,
    sip_status_code: null,
    sip_status_text: null,
    answered_at: "2024-01-15T10:00:02.000Z",
    agent_ready_at: "2024-01-15T10:00:03.500Z",
    call_end_reason: "natural",
    recording_path: "https://your-bucket.s3.us-east-1.amazonaws.com/recordings/call_abc123.ogg",
    transcripts: [
      { speaker: "agent", text: "Hello John, how can I help you today?", timestamp: "2024-01-15T10:00:01.000Z" },
      { speaker: "user", text: "I need help with my order.", timestamp: "2024-01-15T10:00:05.000Z" },
    ],
    started_at: "2024-01-15T10:00:00.000Z",
    ended_at: "2024-01-15T10:05:30.000Z",
    call_duration_minutes: 5.5,
    billable_duration_minutes: 6,
    created_by_email: "user@example.com",
    call_type: "outbound",
    call_service: "exotel",
    platform_number: "08044319240",
    meeting_url: null,
    meeting_connector_status: null,
    meeting_connector_status_reason: null,
    meeting_connector_ready_at: null,
    meeting_connector_ended_at: null,
    ...overrides,
  },
});

/** Token counters every LLM-bearing usage block carries; each sample overrides what it spends. */
const llmCounters = {
  llm_input_tokens: 0,
  llm_output_tokens: 0,
  llm_input_audio_tokens: 0,
  llm_input_text_tokens: 0,
  llm_input_image_tokens: 0,
  llm_output_audio_tokens: 0,
  llm_output_text_tokens: 0,
  llm_total_tokens: 0,
  llm_input_cached_tokens: 0,
  llm_input_cached_audio_tokens: 0,
  llm_input_cached_text_tokens: 0,
  llm_input_cached_image_tokens: 0,
  llm_input_cache_creation_tokens: 0,
  llm_session_duration: 0,
};

const speechCounters = {
  tts_characters_count: 0,
  tts_audio_duration: 0,
  tts_input_tokens: 0,
  tts_output_tokens: 0,
  stt_provider: null,
  stt_model: null,
  stt_audio_duration: 0,
  stt_input_tokens: 0,
  stt_input_audio_tokens: 0,
  stt_input_text_tokens: 0,
  stt_output_tokens: 0,
};

const usageTail = {
  usage_schema_version: 3,
  sdk_version: "1.8.8",
  usage_finalized: true,
  pricing_schema_version: 2,
  pricing_complete: true,
  unpriced_model_usage: [],
};

// Costs follow `reference/pricing.md`: they are decimal strings, and they add up to the call total.
const CASCADE_SAMPLE = callRecord({
  usage: {
    mode: "cascade",
    call_duration_minutes: 5.5,
    call_service: "exotel",
    tts_provider: "cartesia",
    llm_realtime_provider: null,
    llm_model: "gpt-4.1-mini",
    ...llmCounters,
    llm_input_tokens: 9250,
    llm_output_tokens: 1230,
    llm_input_text_tokens: 9250,
    llm_output_text_tokens: 1230,
    llm_total_tokens: 10480,
    llm_input_cached_tokens: 512,
    llm_input_cached_text_tokens: 512,
    ...speechCounters,
    tts_characters_count: 485,
    tts_audio_duration: 32.5,
    stt_provider: "sarvam",
    stt_model: "saaras:v3",
    stt_audio_duration: 41.75,
    model_usage: [
      { type: "llm_usage", provider: "openai", model: "gpt-4.1-mini", input_tokens: 9250, output_tokens: 1230, estimated_cost_usd: "0.0055144" },
      { type: "tts_usage", provider: "cartesia", model: "sonic-3", characters_count: 485, audio_duration: 32.5, estimated_cost_usd: "0.018915" },
      { type: "stt_usage", provider: "sarvam", model: "saaras:v3", audio_duration: 41.75, estimated_cost_usd: "0.004175" },
    ],
    estimated_cost_usd: "0.0286044",
    ...usageTail,
  },
});

const REALTIME_SAMPLE = callRecord({
  usage: {
    mode: "realtime",
    call_duration_minutes: 5.5,
    call_service: "exotel",
    tts_provider: null,
    llm_realtime_provider: "gemini",
    llm_model: "gemini-3.8-live",
    ...llmCounters,
    llm_input_tokens: 12800,
    llm_output_tokens: 3300,
    llm_input_audio_tokens: 12000,
    llm_input_text_tokens: 800,
    llm_output_audio_tokens: 3000,
    llm_output_text_tokens: 300,
    llm_total_tokens: 16100,
    // Gemini folds the caller's audio into its own token counts, so there is no separate STT line.
    ...speechCounters,
    model_usage: [
      { type: "llm_usage", provider: "gemini", model: "gemini-3.8-live", input_tokens: 12800, output_tokens: 3300, estimated_cost_usd: "0.07395" },
    ],
    estimated_cost_usd: "0.07395",
    ...usageTail,
  },
});

const DUPLEX_SAMPLE = callRecord({
  usage: {
    mode: "duplex",
    call_duration_minutes: 2,
    call_service: "exotel",
    tts_provider: null,
    llm_realtime_provider: "openai",
    llm_model: "gpt-live-1, gpt-6-luna-2026-09-30",
    ...llmCounters,
    llm_input_tokens: 1000,
    llm_output_tokens: 300,
    llm_input_text_tokens: 1000,
    llm_output_text_tokens: 300,
    llm_total_tokens: 1300,
    llm_session_duration: 120,
    ...speechCounters,
    // One entry per model: GPT-Live by session seconds, its backend model by tokens. Calls recorded
    // before upstream 1.7.0 type both of these `llm_usage`.
    model_usage: [
      { type: "voice_llm_usage", provider: "openai", model: "gpt-live-1", session_duration: 120, estimated_cost_usd: "0.1000" },
      { type: "backend_llm_usage", provider: "openai", model: "gpt-6-luna-2026-09-30", input_tokens: 1000, output_tokens: 300, estimated_cost_usd: "0.00025" },
    ],
    estimated_cost_usd: "0.10025",
    ...usageTail,
  },
});

// Nobody answered: no agent session ever ran, so there is no usage record and no `usage` key.
const NO_ANSWER_SAMPLE = callRecord({
  call_status: "no_answer",
  call_status_reason: "Callee did not answer in time",
  sip_status_code: 480,
  sip_status_text: "Temporarily Unavailable",
  answered_at: null,
  agent_ready_at: null,
  call_end_reason: null,
  recording_path: null,
  transcripts: [],
  ended_at: "2024-01-15T10:00:45.000Z",
  call_duration_minutes: 0.75,
  billable_duration_minutes: 0,
});

/** One per way a call can end that changes the payload's shape. */
export const END_CALL_WEBHOOK_SAMPLES: WebhookSample[] = [
  { id: "cascade", label: "Cascade", value: CASCADE_SAMPLE },
  { id: "realtime", label: "Realtime", value: REALTIME_SAMPLE },
  { id: "duplex", label: "Duplex", value: DUPLEX_SAMPLE },
  { id: "no-answer", label: "No answer", value: NO_ANSWER_SAMPLE },
];

/** Same envelope, but nothing ran an assistant: no ids, no transcript, no `usage` key at all. */
export const PASSTHROUGH_WEBHOOK_SAMPLE = {
  success: true,
  message: "Call details fetched successfully",
  data: {
    room_name: "passthrough_abc123def456",
    queue_id: "8b7df5ea0fdc497ea4f44bd31954a387",
    assistant_id: null,
    assistant_name: null,
    is_passthrough: true,
    to_number: "+15550200000",
    call_status: "completed",
    call_status_reason: null,
    sip_status_code: null,
    sip_status_text: null,
    answered_at: "2024-01-15T10:00:05.000Z",
    recording_path: "https://your-bucket.s3.amazonaws.com/recordings/passthrough_abc123.ogg",
    transcripts: [],
    started_at: "2024-01-15T10:00:00.000Z",
    ended_at: "2024-01-15T10:05:30.000Z",
    call_duration_minutes: 5.42,
    billable_duration_minutes: 6,
    call_type: "outbound",
    call_service: "twilio",
    platform_number: "+15550100000",
  },
};
