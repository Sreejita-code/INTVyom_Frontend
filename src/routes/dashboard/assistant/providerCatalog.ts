/**
 * Every provider, model ID and config knob the assistant API accepts, as data.
 *
 * This file is the frontend mirror of the backend's `src/assistant/assistant.rules.js` and the
 * upstream `reference/models.md`. The form renders from these specs rather than hardcoding
 * fields per provider, so adding a provider is one entry here and nothing else.
 *
 * `help` is what the knob does on a real call. `warn` is the trap — the thing that silently
 * does nothing, costs money, or means the opposite of what the field name suggests. Every warn
 * line here comes from the upstream pitfalls list, not from guesswork.
 */

export type ControlKind = "select" | "text" | "number" | "slider" | "switch";

export interface FieldOption {
  value: string;
  label: string;
  hint?: string;
}

export interface FieldSpec {
  key: string;
  label: string;
  control: ControlKind;
  /** Nests the value one level down, e.g. ElevenLabs `voice_settings.stability`. */
  group?: string;
  options?: FieldOption[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Shown as the control's value when the stored config has nothing. */
  fallback?: string | number | boolean;
  help: string;
  warn?: string;
  /** Folded into the Advanced accordion instead of the default view. */
  advanced?: boolean;
  /** Monospace input — model IDs, voice IDs, dictionary IDs. */
  mono?: boolean;
  required?: boolean;
}

export interface ProviderSpec {
  value: string;
  label: string;
  /** One line under the provider select, describing the provider as a whole. */
  tagline: string;
  fields: FieldSpec[];
}

// --- Language sets ------------------------------------------------------------------------
// Five surfaces, four alphabets. Sending a Sarvam `-IN` code to Cartesia is a silent
// mis-transcription, so each provider gets the codes it actually accepts.

/** Sarvam: 23 Indic BCP-47 codes plus `unknown` for auto-detect. */
export const SARVAM_LANGUAGES = [
  "as-IN", "bn-IN", "brx-IN", "doi-IN", "en-IN", "gu-IN", "hi-IN", "kn-IN",
  "kok-IN", "ks-IN", "mai-IN", "ml-IN", "mni-IN", "mr-IN", "ne-IN", "od-IN",
  "pa-IN", "sa-IN", "sat-IN", "sd-IN", "ta-IN", "te-IN", "ur-IN",
] as const;

/** Cartesia ink-whisper: 43 two-letter codes. No auto-detect on this provider. */
export const CARTESIA_LANGUAGES = [
  "en", "de", "es", "fr", "ja", "pt", "zh", "hi", "ko", "it", "nl", "pl", "ru",
  "sv", "tr", "tl", "bg", "ro", "ar", "cs", "el", "fi", "hr", "ms", "sk", "da",
  "ta", "uk", "hu", "no", "vi", "bn", "th", "he", "ka", "id", "te", "gu", "kn",
  "ml", "mr", "or", "pa",
] as const;

/** OpenAI transcription: ISO-639-1. */
export const OPENAI_STT_LANGUAGES = [
  "en", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "ur",
  "ar", "de", "es", "fr", "id", "it", "ja", "ko", "nl", "pt", "ru", "th",
  "tr", "vi", "zh",
] as const;

/** Deepgram and ElevenLabs both take BCP-47; these are the ones worth listing. */
export const BCP47_LANGUAGES = [
  "en-US", "en-GB", "en-IN", "hi-IN", "bn-IN", "ta-IN", "te-IN", "mr-IN",
  "gu-IN", "kn-IN", "ml-IN", "pa-IN", "ur-IN", "ar-SA", "de-DE", "es-ES",
  "fr-FR", "id-ID", "it-IT", "ja-JP", "ko-KR", "nl-NL", "pt-BR", "ru-RU",
  "th-TH", "tr-TR", "vi-VN", "zh-CN",
] as const;

/**
 * `preferred_languages` and the Sarvam TTS target. Kept to the Indic set the product serves —
 * this is a hint list, not a hard constraint, and a long list makes the picker unusable.
 */
export const LANGUAGE_CODES = [
  "en-IN", "en-US", "hi-IN", "bn-IN", "ta-IN", "te-IN",
  "mr-IN", "gu-IN", "kn-IN", "ml-IN", "pa-IN", "od-IN",
] as const;

const asOptions = (codes: readonly string[]): FieldOption[] =>
  codes.map((value) => ({ value, label: value }));

// --- LLM ----------------------------------------------------------------------------------

/**
 * Realtime model IDs — `pipeline` (text-only modality) and `realtime` + OpenAI.
 * Disjoint from the cascade list: sending a chat model here is a 400.
 */
export const OPENAI_REALTIME_MODELS: FieldOption[] = [
  { value: "gpt-realtime-1.5", label: "gpt-realtime-1.5", hint: "Default. Current realtime model." },
  { value: "gpt-realtime", label: "gpt-realtime", hint: "Previous generation." },
  { value: "gpt-realtime-mini", label: "gpt-realtime-mini", hint: "Cheaper and faster, less capable." },
  { value: "gpt-4o-realtime-preview", label: "gpt-4o-realtime-preview", hint: "Legacy preview model." },
  { value: "gpt-4o-mini-realtime-preview", label: "gpt-4o-mini-realtime-preview", hint: "Legacy preview, smaller." },
];

/** Chat models for the cascade LLM stage. Sending one of these in pipeline mode is a 400. */
export const OPENAI_CASCADE_MODELS: FieldOption[] = [
  { value: "gpt-4.1", label: "gpt-4.1", hint: "Default. General-purpose, not a reasoning model." },
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini", hint: "Cheaper and faster." },
  { value: "gpt-4.1-nano", label: "gpt-4.1-nano", hint: "Cheapest of the 4.1 line." },
  { value: "gpt-4o", label: "gpt-4o", hint: "Legacy multimodal chat model." },
  { value: "gpt-4o-mini", label: "gpt-4o-mini", hint: "Legacy, smaller." },
  { value: "gpt-5", label: "gpt-5", hint: "Reasoning model — uses reasoning effort, ignores temperature." },
  { value: "gpt-5-mini", label: "gpt-5-mini", hint: "Reasoning, smaller and cheaper." },
  { value: "gpt-5-nano", label: "gpt-5-nano", hint: "Reasoning, cheapest." },
  { value: "gpt-5.1", label: "gpt-5.1", hint: "Reasoning model." },
  { value: "gpt-5.1-chat-latest", label: "gpt-5.1-chat-latest", hint: "Reasoning model." },
  { value: "gpt-5.2", label: "gpt-5.2", hint: "Reasoning model." },
  { value: "gpt-5.2-chat-latest", label: "gpt-5.2-chat-latest", hint: "Reasoning model." },
  { value: "gpt-5.3-chat-latest", label: "gpt-5.3-chat-latest", hint: "Reasoning model." },
  { value: "gpt-5.4", label: "gpt-5.4", hint: "Reasoning model." },
  { value: "gpt-5.4-mini", label: "gpt-5.4-mini", hint: "Reasoning, smaller." },
  { value: "gpt-5.4-nano", label: "gpt-5.4-nano", hint: "Reasoning, cheapest of the 5.4 line." },
  { value: "gpt-5.5", label: "gpt-5.5", hint: "Reasoning model." },
  { value: "gpt-5.6-sol", label: "gpt-5.6-sol", hint: "Reasoning model." },
  { value: "gpt-5.6-terra", label: "gpt-5.6-terra", hint: "Reasoning model." },
  { value: "gpt-5.6-luna", label: "gpt-5.6-luna", hint: "Reasoning model." },
  { value: "chat-latest", label: "chat-latest", hint: "Follows the newest gpt-5.x chat snapshot." },
  { value: "gpt-oss-120b", label: "gpt-oss-120b", hint: "Open-weight model, not a reasoning model." },
];

/**
 * The gpt-5 line reasons and ignores `temperature`; everything else is the reverse. The form
 * shows both knobs either way and greys out whichever one this model throws away.
 */
export const isReasoningModel = (model?: string) => /^gpt-5/.test(model?.trim() ?? "");

/** Cascade-only generation knobs. Stored in every mode, read only in cascade. */
export const CASCADE_LLM_FIELDS: FieldSpec[] = [
  {
    key: "temperature",
    label: "Temperature",
    control: "slider",
    min: 0,
    max: 2,
    step: 0.05,
    fallback: 0.8,
    help: "How much the wording varies between two identical calls. Low sounds scripted and repeats itself; high wanders off-script.",
  },
  {
    key: "reasoning_effort",
    label: "Reasoning effort",
    control: "select",
    options: [
      { value: "none", label: "none", hint: "No deliberation. Fastest, cheapest." },
      { value: "minimal", label: "minimal" },
      { value: "low", label: "low", hint: "Good default for phone calls — keeps replies snappy." },
      { value: "medium", label: "medium" },
      { value: "high", label: "high", hint: "Noticeably slower to first word." },
      { value: "xhigh", label: "xhigh" },
      { value: "max", label: "max", hint: "Slowest. Callers will hear the pause." },
    ],
    help: "How long the model thinks before answering. Every step up adds silence before the assistant starts speaking, and adds tokens to the bill.",
  },
  {
    key: "max_output_tokens",
    label: "Max output tokens",
    control: "number",
    min: 1,
    placeholder: "Model default",
    help: "Hard cap on reply length. A caller hears a cut-off sentence if the model hits it mid-answer, so leave headroom.",
    advanced: true,
  },
  {
    key: "verbosity",
    label: "Verbosity",
    control: "select",
    options: [
      { value: "low", label: "low", hint: "Short replies. Usually right for voice." },
      { value: "medium", label: "medium" },
      { value: "high", label: "high", hint: "Long replies — a caller waits through all of it." },
    ],
    help: "Steers reply length without a hard cap. Voice calls read better on low.",
    advanced: true,
  },
  {
    key: "service_tier",
    label: "Service tier",
    control: "select",
    options: [
      { value: "auto", label: "auto" },
      { value: "default", label: "default" },
      { value: "flex", label: "flex", hint: "Cheaper, can queue under load." },
      { value: "scale", label: "scale" },
      { value: "priority", label: "priority", hint: "Dearest, most consistent latency." },
    ],
    help: "OpenAI's processing and billing tier. Priority buys steadier latency; flex trades latency for cost.",
    advanced: true,
  },
  {
    key: "tool_choice",
    label: "Tool choice",
    control: "select",
    options: [
      { value: "auto", label: "auto", hint: "Model decides when to call a tool." },
      { value: "required", label: "required", hint: "Forces a tool call on every turn." },
      { value: "none", label: "none", hint: "Disables the attached tools." },
    ],
    help: "Whether the assistant may use the tools attached below.",
    warn: "`required` forces a tool call on every single turn, including \"hello\" — it is rarely what you want on a call.",
    advanced: true,
  },
  {
    key: "parallel_tool_calls",
    label: "Parallel tool calls",
    control: "switch",
    help: "Lets the model fire several tools in one turn instead of one at a time.",
    advanced: true,
  },
];

// --- STT ----------------------------------------------------------------------------------

export const STT_PROVIDERS: ProviderSpec[] = [
  {
    value: "sarvam",
    label: "Sarvam",
    tagline: "Indic-first. Auto-detects and keeps Hinglish code-switching intact inside one sentence.",
    fields: [
      {
        key: "model",
        label: "Model",
        control: "select",
        fallback: "saaras:v3",
        options: [
          { value: "saaras:v3", label: "saaras:v3", hint: "Default. The only model that reads transcription mode." },
          { value: "saaras:v2.5", label: "saaras:v2.5" },
          { value: "saarika:v2.5", label: "saarika:v2.5" },
        ],
        help: "Which Saras model transcribes the caller.",
      },
      {
        key: "language",
        label: "Language",
        control: "select",
        fallback: "unknown",
        options: [
          { value: "unknown", label: "Auto-detect", hint: "Recommended. Detects the language per utterance." },
          ...asOptions(SARVAM_LANGUAGES),
        ],
        help: "Auto-detect handles a caller who switches language mid-sentence. Pinning a code locks every utterance to it.",
      },
      {
        key: "mode",
        label: "Transcription style",
        control: "select",
        fallback: "codemix",
        options: [
          { value: "codemix", label: "codemix", hint: "English words stay English, Indic words in native script." },
          { value: "transcribe", label: "transcribe", hint: "Plain transcription, formatted, numbers normalized." },
          { value: "translate", label: "translate", hint: "Transcribes, then translates to English." },
          { value: "verbatim", label: "verbatim", hint: "Word for word — keeps um, uh and spoken numbers." },
          { value: "translit", label: "translit", hint: "Romanized: \"mera phone number hai 9840950950\"." },
        ],
        help: "The shape of the transcript your webhooks and call logs receive. It does not change what the assistant understands, only how the text is written down.",
        warn: "Read on saaras:v3 only. The older Saras models ignore it.",
      },
    ],
  },
  {
    value: "cartesia",
    label: "Cartesia",
    tagline: "One fixed language, low latency. Cascade only.",
    fields: [
      {
        key: "model",
        label: "Model",
        control: "select",
        fallback: "ink-whisper",
        options: [
          { value: "ink-whisper", label: "ink-whisper", hint: "Default. 43 languages." },
          { value: "ink-2", label: "ink-2", hint: "English only." },
        ],
        help: "Which Cartesia STT model transcribes the caller.",
      },
      {
        key: "language",
        label: "Language",
        control: "select",
        fallback: "en",
        options: asOptions(CARTESIA_LANGUAGES),
        help: "The one language this assistant transcribes.",
        warn: "Cartesia cannot auto-detect. A caller who switches language is mis-transcribed for the rest of the call — use Sarvam or Deepgram multi if that is likely.",
      },
    ],
  },
  {
    value: "deepgram",
    label: "Deepgram",
    tagline: "Fast and accurate across 45 languages, with speaker labels. Cascade only.",
    fields: [
      {
        key: "model",
        label: "Model",
        control: "select",
        fallback: "nova-3",
        options: [
          { value: "nova-3", label: "nova-3", hint: "Default. 45 languages, reads keyterms." },
          { value: "nova-2", label: "nova-2", hint: "Previous generation." },
          { value: "flux-general-en", label: "flux-general-en", hint: "English only, brings its own turn detection." },
          { value: "flux-general-multi", label: "flux-general-multi", hint: "Multilingual, brings its own turn detection." },
        ],
        help: "Nova models run on Deepgram's streaming API; flux models run the turn-based API and handle endpointing themselves. Selecting one is all you need to change.",
      },
      {
        key: "language",
        label: "Language",
        control: "select",
        fallback: "multi",
        options: [
          { value: "multi", label: "multi (auto-detect)", hint: "Detects the language per segment." },
          ...asOptions(BCP47_LANGUAGES),
        ],
        help: "Pin one language, or use multi to detect per segment.",
        warn: "Leaving this unset does NOT auto-detect — Deepgram falls back to your first preferred language, then to English. Multi is also billed at a higher per-minute rate.",
      },
      {
        key: "enable_diarization",
        label: "Speaker labels",
        control: "switch",
        help: "Tags each utterance with which speaker said it, so the transcript separates caller from anyone else on the line.",
        warn: "Nova models only. On flux it is dropped with a warning.",
      },
      {
        key: "keyterm",
        label: "Key term",
        control: "text",
        placeholder: "e.g. invoice",
        help: "Biases recognition toward a term the model keeps getting wrong — a product name, a surname.",
        warn: "Read on nova-3 and flux only. On nova-2 it does nothing at all.",
        advanced: true,
      },
    ],
  },
  {
    value: "elevenlabs",
    label: "ElevenLabs",
    tagline: "Widest language coverage — auto-detects around 190 languages. Cascade only.",
    fields: [
      {
        key: "model",
        label: "Model",
        control: "select",
        fallback: "scribe_v2_realtime",
        options: [
          { value: "scribe_v2_realtime", label: "scribe_v2_realtime", hint: "Default. Streaming, auto-detects ~190 languages." },
          { value: "scribe_v2", label: "scribe_v2" },
          { value: "scribe_v1", label: "scribe_v1", hint: "Legacy." },
        ],
        help: "Which Scribe model transcribes the caller.",
      },
      {
        key: "language_code",
        label: "Language",
        control: "select",
        fallback: "",
        options: [
          { value: "", label: "Auto-detect", hint: "Only works when Preferred languages is also empty." },
          ...asOptions(BCP47_LANGUAGES),
        ],
        help: "Pin one language, or leave on auto-detect.",
        warn: "Auto-detect needs this AND Preferred languages empty — a non-empty preferred list pins its first entry and turns detection off, which is the opposite of what that field's name suggests.",
      },
      {
        key: "no_verbatim",
        label: "Strip filler words",
        control: "switch",
        help: "Drops um, uh and false starts from the transcript. Cleaner call logs; you lose the caller's hesitation as a signal.",
        advanced: true,
      },
    ],
  },
  {
    value: "openai",
    label: "OpenAI",
    tagline: "Same vendor and same key as the cascade LLM stage. Cascade only.",
    fields: [
      {
        key: "model",
        label: "Model",
        control: "select",
        fallback: "gpt-4o-mini-transcribe",
        options: [
          { value: "gpt-4o-mini-transcribe", label: "gpt-4o-mini-transcribe", hint: "Default. Fast and cheap." },
          { value: "gpt-4o-transcribe", label: "gpt-4o-transcribe", hint: "More accurate, dearer." },
          { value: "whisper-1", label: "whisper-1", hint: "Legacy batch model. The only one that reads the prompt field." },
        ],
        help: "Which OpenAI transcription model runs.",
      },
      {
        key: "detect_language",
        label: "Auto-detect language",
        control: "switch",
        help: "Lets the model work out what the caller is speaking instead of being told.",
        warn: "Overrides the Language field below — set one or the other, not both.",
      },
      {
        key: "language",
        label: "Language",
        control: "select",
        fallback: "en",
        options: asOptions(OPENAI_STT_LANGUAGES),
        help: "The one language this assistant transcribes.",
        warn: "Leaving this unset does NOT auto-detect — it falls back to your first preferred language, then to English. Turn on auto-detect above instead.",
      },
      {
        key: "use_realtime",
        label: "Stream transcription",
        control: "switch",
        fallback: true,
        help: "On, transcripts stream over a websocket and interim words arrive as the caller speaks. Off uses the batch API — cheaper, but the assistant waits for the caller to finish the whole utterance before it can start thinking.",
        warn: "Off adds roughly one utterance of silence to every turn. Only worth it when cost beats responsiveness.",
        advanced: true,
      },
      {
        key: "noise_reduction_type",
        label: "Noise reduction",
        control: "select",
        options: [
          { value: "near_field", label: "near_field", hint: "Headset or handset held to the ear." },
          { value: "far_field", label: "far_field", hint: "Speakerphone or a room mic." },
        ],
        help: "Server-side cleanup tuned to how far the caller is from the microphone.",
        advanced: true,
      },
      {
        key: "prompt",
        label: "Recognition prompt",
        control: "text",
        placeholder: "Product names, spellings the model keeps missing",
        help: "Biases spellings and jargon — brand names, surnames, SKUs.",
        warn: "whisper-1 only. The gpt-4o transcribe models accept it and ignore it, with no error.",
        advanced: true,
      },
    ],
  },
  {
    value: "native",
    label: "Native",
    tagline: "The conversational model transcribes itself. No second connection, no extra key.",
    fields: [],
  },
];

// --- TTS ----------------------------------------------------------------------------------

export const TTS_PROVIDERS: ProviderSpec[] = [
  {
    value: "cartesia",
    label: "Cartesia",
    tagline: "Sonic 3. Expressive, with direct speed, volume and emotion control.",
    fields: [
      {
        key: "voice_id",
        label: "Voice ID",
        control: "text",
        mono: true,
        required: true,
        placeholder: "a167e0f3-df7e-4277-976b-be2f952fa275",
        help: "The Cartesia voice that speaks. Copy the ID from your Cartesia voice library.",
      },
      {
        key: "language",
        label: "Language",
        control: "select",
        fallback: "en",
        options: asOptions(CARTESIA_LANGUAGES),
        help: "Pronunciation rules for the text being spoken. It does not translate anything — the assistant still writes whatever the prompt tells it to.",
      },
      {
        key: "speed",
        label: "Speed",
        control: "slider",
        min: 0,
        max: 3,
        step: 0.05,
        fallback: 1,
        help: "Speaking rate as a multiplier. 1.0 is the voice's natural pace; 1.2 is noticeably brisk without sounding rushed.",
      },
      {
        key: "volume",
        label: "Volume",
        control: "slider",
        min: 0,
        max: 3,
        step: 0.05,
        fallback: 1,
        help: "Output level. Raise it for noisy phone lines.",
        advanced: true,
      },
      {
        key: "emotion",
        label: "Emotion",
        control: "text",
        placeholder: "e.g. calm, excited, sad",
        help: "Steers delivery on Sonic 3. Calm suits support lines; excited suits sales.",
        advanced: true,
      },
      {
        key: "pronunciation_dict_id",
        label: "Pronunciation dictionary",
        control: "text",
        mono: true,
        placeholder: "Cartesia dictionary ID",
        help: "Applies a saved dictionary so the voice says your product and place names correctly.",
        advanced: true,
      },
    ],
  },
  {
    value: "sarvam",
    label: "Sarvam",
    tagline: "Bulbul v3. Native Indic pronunciation across 12 languages.",
    fields: [
      {
        key: "speaker",
        label: "Speaker",
        control: "text",
        mono: true,
        required: true,
        placeholder: "Sarvam speaker name",
        help: "The Sarvam speaker that voices this assistant.",
      },
      {
        key: "target_language_code",
        label: "Target language",
        control: "select",
        fallback: "en-IN",
        options: asOptions(LANGUAGE_CODES),
        help: "The language Bulbul speaks in.",
        warn: "Assistants created before this field was fixed have bn-IN stored and will speak Bengali. Set it explicitly once to correct them.",
      },
      {
        key: "pace",
        label: "Pace",
        control: "slider",
        min: 0.3,
        max: 3,
        step: 0.05,
        fallback: 1,
        help: "Speaking rate. Above 1.0 is faster, below is slower. Sarvam calls it pace where Cartesia calls it speed — the same idea, different key.",
      },
      {
        key: "temperature",
        label: "Expressiveness",
        control: "slider",
        min: 0.01,
        max: 2,
        step: 0.01,
        fallback: 0.3,
        help: "How much the delivery varies between renders. Low is steady and predictable; high is more animated but less consistent across a call.",
        advanced: true,
      },
      {
        key: "speech_sample_rate",
        label: "Sample rate",
        control: "select",
        fallback: "24000",
        options: [
          { value: "8000", label: "8000 Hz", hint: "Narrowband telephony only." },
          { value: "16000", label: "16000 Hz" },
          { value: "22050", label: "22050 Hz" },
          { value: "24000", label: "24000 Hz", hint: "Default." },
          { value: "32000", label: "32000 Hz" },
          { value: "44100", label: "44100 Hz" },
          { value: "48000", label: "48000 Hz" },
        ],
        help: "Audio quality of the synthesized speech. The default suits phone calls; anything lower sounds tinny.",
        advanced: true,
      },
    ],
  },
  {
    value: "elevenlabs",
    label: "ElevenLabs",
    tagline: "The widest voice library, with per-voice stability and style tuning.",
    fields: [
      {
        key: "voice_id",
        label: "Voice ID",
        control: "text",
        mono: true,
        required: true,
        placeholder: "ElevenLabs voice ID",
        help: "The ElevenLabs voice that speaks. Copy the ID from your voice library.",
      },
      {
        key: "model",
        label: "Model",
        control: "select",
        fallback: "eleven_v3",
        options: [
          { value: "eleven_v3", label: "eleven_v3", hint: "Default. Most expressive." },
          { value: "eleven_multilingual_v2", label: "eleven_multilingual_v2" },
          { value: "eleven_turbo_v2_5", label: "eleven_turbo_v2_5", hint: "Lower latency." },
          { value: "eleven_flash_v2_5", label: "eleven_flash_v2_5", hint: "Lowest latency." },
        ],
        help: "ElevenLabs is the one provider whose synthesis model you choose. Flash and turbo start speaking sooner; v3 sounds better.",
      },
      {
        key: "stability",
        label: "Stability",
        control: "slider",
        group: "voice_settings",
        min: 0,
        max: 1,
        step: 0.05,
        fallback: 0.5,
        help: "Low lets the voice swing in emotion between sentences; high keeps it even and can flatten it.",
      },
      {
        key: "similarity_boost",
        label: "Similarity",
        control: "slider",
        group: "voice_settings",
        min: 0,
        max: 1,
        step: 0.05,
        fallback: 0.75,
        help: "How closely the output tracks the original voice recording.",
      },
      {
        key: "speed",
        label: "Speed",
        control: "slider",
        group: "voice_settings",
        min: 0.25,
        max: 4,
        step: 0.05,
        fallback: 1,
        help: "Speaking rate. ElevenLabs nests this inside voice settings — it is not the same key as Cartesia speed or Sarvam pace.",
      },
      {
        key: "style",
        label: "Style",
        control: "slider",
        group: "voice_settings",
        min: 0,
        max: 1,
        step: 0.05,
        fallback: 0,
        help: "Exaggerates the voice's characteristic delivery. Above zero costs latency.",
        advanced: true,
      },
      {
        key: "use_speaker_boost",
        label: "Speaker boost",
        control: "switch",
        group: "voice_settings",
        help: "Sharpens resemblance to the source voice, at some latency.",
        advanced: true,
      },
    ],
  },
  {
    value: "mistral",
    label: "Mistral",
    tagline: "Voxtral mini. One voice field, nothing to tune.",
    fields: [
      {
        key: "voice_id",
        label: "Voice ID",
        control: "text",
        mono: true,
        required: true,
        placeholder: "Mistral voice ID",
        help: "The Mistral voice that speaks.",
        warn: "Mistral exposes no speed, pitch or emotion controls. Pick Cartesia, Sarvam or ElevenLabs if you need to tune delivery.",
      },
    ],
  },
];

// --- Mode rules ---------------------------------------------------------------------------
// Mirrors the backend allowlists. The form uses these to filter selects and to repair the
// config when the user switches mode, so an unrunnable combination cannot be submitted.

export const CASCADE_STT_MODELS = ["sarvam", "cartesia", "deepgram", "elevenlabs", "openai"];

/**
 * The transcribers pipeline mode will actually run.
 *
 * The API is more permissive than this: it accepts all six providers in pipeline and stores
 * whatever you send. But per the upstream compatibility matrix, only these two ever transcribe a
 * pipeline call — `sarvam` as a parallel audio tap, `native` by letting the realtime model
 * transcribe itself. The other four are replaced by `native` at call time, three of them noisily
 * and `openai` silently.
 *
 * The picker offers only these two, because a choice that is accepted and then ignored is worse
 * than a choice that was never offered. Assistants already saved with one of the other four keep
 * it — see `PIPELINE_DEGRADES_STT` and `sttOptionsFor`.
 */
export const PIPELINE_STT_MODELS = ["sarvam", "native"];

/**
 * Providers pipeline accepts and stores but does not run — it transcribes natively instead.
 *
 * These are no longer selectable in pipeline mode, so this list now describes what happens to an
 * assistant that was *already* saved with one, rather than a choice a user can still make. It stays
 * split from the `openai` case on purpose: upstream logs a warning for these three because no
 * parallel-tap implementation exists and you genuinely lose the engine you picked, and stays silent
 * for `openai` because the realtime model already transcribes with the same vendor and the same
 * model, so nothing is lost and nothing extra is billed.
 */
export const PIPELINE_DEGRADES_STT = ["cartesia", "deepgram", "elevenlabs"];

/**
 * The providers to offer for a mode, given what this assistant already has stored.
 *
 * The stored value is always included even when the mode would not otherwise offer it. Two reasons:
 * a Radix `Select` whose value is missing from its items renders an empty trigger, which reads as
 * data loss; and dropping it would leave a user unable to see — let alone repair — a combination an
 * earlier version of this editor allowed them to save.
 */
export const sttOptionsFor = (mode: string, stored?: string): ProviderSpec[] => {
  const allowed = mode === "cascade" ? CASCADE_STT_MODELS : PIPELINE_STT_MODELS;
  return STT_PROVIDERS.filter((p) => allowed.includes(p.value) || p.value === stored);
};

export const findProvider = (list: ProviderSpec[], value?: string) =>
  list.find((p) => p.value === value);

/** The default config for a provider: every non-advanced field at its fallback. */
export const defaultConfigFor = (spec?: ProviderSpec): Record<string, any> => {
  if (!spec) return {};
  const config: Record<string, any> = {};
  for (const field of spec.fields) {
    if (field.fallback === undefined || field.advanced) continue;
    if (field.group) {
      config[field.group] = { ...(config[field.group] || {}), [field.key]: field.fallback };
    } else {
      config[field.key] = field.fallback;
    }
  }
  return config;
};
