import { AssistantMode } from "@/types/assistant";

/**
 * The four runtime modes, described the way the platform actually runs them.
 *
 * Source: the upstream `architecture/runtime-modes.md` contract. The distinction that matters and
 * that the old copy got wrong: in `pipeline` the transcriber is a *parallel tap* used only to write
 * transcripts — the realtime model still hears the raw audio itself — while in `cascade` the
 * transcriber is genuinely the first stage and the only thing the text model ever sees. `duplex`
 * is different in kind: one full-duplex voice model that can talk while the caller talks, with a
 * second reasoning model behind it for anything that needs thought or a tool.
 */
export interface ModeSpec {
  value: AssistantMode;
  title: string;
  /** The one-line mechanical truth: which models run, and in what relationship. */
  what: string;
  /** When a user should choose this over the other two. */
  pickWhen: string;
  /** Which LLM vendors this mode accepts, for the card footnote. */
  vendors: string;
}

export const MODES: ModeSpec[] = [
  {
    value: "realtime",
    title: "Realtime",
    what: "One model hears, thinks and speaks, in its own voice. No separate transcriber or speech provider.",
    pickWhen: "You want the lowest latency and the fewest things to tune.",
    vendors: "Gemini or OpenAI",
  },
  {
    value: "pipeline",
    title: "Pipeline",
    what: "A realtime model listens and writes the reply; a voice provider you pick speaks it. A parallel transcriber writes the transcript.",
    pickWhen: "You want realtime understanding but a specific TTS voice.",
    vendors: "OpenAI only",
  },
  {
    value: "cascade",
    title: "Cascade",
    what: "Three separate models in sequence: a transcriber, a text model, a voice. Each is metered and swappable on its own.",
    pickWhen: "You want per-stage cost visibility and cheap text models.",
    vendors: "OpenAI only",
  },
  {
    value: "duplex",
    title: "Duplex",
    what: "OpenAI GPT-Live hears and speaks at the same time and decides its own turns. A reasoning model behind it handles thinking and tools.",
    pickWhen: "You want natural overlap and back-channel \"mm-hm\", and can live without a fixed greeting or filler words.",
    vendors: "OpenAI GPT-Live only",
  },
];

export function findMode(mode: string | undefined): ModeSpec {
  return MODES.find((m) => m.value === mode) ?? MODES[1];
}

/**
 * Every surface that identifies a mode reads its colour from here, so the list chip, the picker
 * card, the chain diagram and the log table can never drift apart. Written out in full rather than
 * interpolated because Tailwind only sees class names it can find literally in the source.
 */
export const MODE_ACCENT: Record<AssistantMode, { chip: string; card: string; text: string; ring: string }> = {
  realtime: {
    chip: "border-mode-realtime/30 bg-mode-realtime/10 text-mode-realtime",
    card: "border-mode-realtime/50 bg-mode-realtime/[0.07]",
    text: "text-mode-realtime",
    ring: "ring-mode-realtime/30",
  },
  pipeline: {
    chip: "border-mode-pipeline/30 bg-mode-pipeline/10 text-mode-pipeline",
    card: "border-mode-pipeline/50 bg-mode-pipeline/[0.07]",
    text: "text-mode-pipeline",
    ring: "ring-mode-pipeline/30",
  },
  cascade: {
    chip: "border-mode-cascade/30 bg-mode-cascade/10 text-mode-cascade",
    card: "border-mode-cascade/50 bg-mode-cascade/[0.07]",
    text: "text-mode-cascade",
    ring: "ring-mode-cascade/30",
  },
  duplex: {
    chip: "border-mode-duplex/30 bg-mode-duplex/10 text-mode-duplex",
    card: "border-mode-duplex/50 bg-mode-duplex/[0.07]",
    text: "text-mode-duplex",
    ring: "ring-mode-duplex/30",
  },
};

/** What the API sends for `assistant_mode`, narrowed. Missing or unknown means `pipeline`, the API default. */
export const parseAssistantMode = (raw: unknown): AssistantMode =>
  typeof raw === "string" && raw in MODE_ACCENT ? (raw as AssistantMode) : "pipeline";

export function modeAccent(mode: string | undefined) {
  return MODE_ACCENT[parseAssistantMode(mode)];
}
