import { ArrowRight, Brain, Mic, Phone, Volume2 } from "lucide-react";

import { AssistantMode } from "@/types/assistant";
import { cn } from "@/lib/utils";
import { modeAccent } from "@/lib/assistantModes";

interface AudioChainProps {
  mode: AssistantMode;
  /** Current selections, already formatted for display by the caller. */
  stt: string;
  llm: string;
  tts: string;
}

/** One box in the chain. `dim` marks the caller, who is not something you configure. */
function Node({
  icon: Icon,
  role,
  value,
  accent,
  dim,
}: {
  icon: typeof Phone;
  role: string;
  value?: string;
  accent?: string;
  dim?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-xl border px-3 py-2",
        dim ? "border-border/50 bg-background/40" : cn("bg-card/70", accent),
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
        <Icon className={cn("h-3 w-3 shrink-0", dim && "text-muted-foreground")} />
        <span className={cn("truncate", dim && "text-muted-foreground")}>{role}</span>
      </span>
      {value && (
        <span title={value} className="max-w-[11rem] truncate font-mono text-[11px] text-muted-foreground">
          {value}
        </span>
      )}
    </div>
  );
}

function Arrow() {
  return <ArrowRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/40" aria-hidden="true" />;
}

/**
 * The audio path as a picture, redrawn whenever the mode changes.
 *
 * This exists because the three modes differ in *shape*, not in settings, and a list of stages
 * cannot show that. The one thing it has to get across is the pipeline tap: the transcriber hangs
 * off the model rather than sitting in front of it, because the model hears the caller directly and
 * the tap only writes the transcript. Drawn as a fourth box in a row, that reads as a cascade.
 */
export function AudioChain({ mode, stt, llm, tts }: AudioChainProps) {
  const accent = modeAccent(mode);

  const spoken =
    mode === "realtime"
      ? `Caller to ${llm}, which hears, thinks and speaks, and back to the caller.`
      : mode === "cascade"
        ? `Caller to ${stt}, to ${llm}, to ${tts}, and back to the caller.`
        : `Caller to ${llm}, to ${tts}, and back to the caller, with ${stt} tapping the caller's audio to write transcripts.`;

  return (
    <div
      role="img"
      aria-label={spoken}
      className={cn("grid gap-3 overflow-x-auto rounded-xl border bg-background/30 p-4", accent.card)}
    >
      {/* Never wraps: a chain that folds mid-sequence puts an arrow at the end of a line pointing
          at nothing, which reads as a broken diagram. It scrolls sideways in its own box instead. */}
      <div className="flex w-max items-stretch gap-2">
        <Node icon={Phone} role="Caller" dim />
        <Arrow />

        {mode === "cascade" && (
          <>
            <Node icon={Mic} role="Transcriber" value={stt} accent={accent.card} />
            <Arrow />
          </>
        )}

        <Node
          icon={Brain}
          role={mode === "realtime" ? "Model — hears, thinks, speaks" : mode === "cascade" ? "Text model" : "Realtime model"}
          value={llm}
          accent={accent.card}
        />

        {mode !== "realtime" && (
          <>
            <Arrow />
            <Node icon={Volume2} role="Voice" value={tts} accent={accent.card} />
          </>
        )}

        <Arrow />
        <Node icon={Phone} role="Caller" dim />
      </div>

      {mode === "pipeline" && (
        // The tap, drawn as a branch under the model rather than a step in the row above it.
        <div className="flex w-max items-center gap-2 pl-[5.5rem]">
          <span className="h-4 w-4 shrink-0 self-start rounded-bl-md border-b border-l border-dashed border-border" />
          <Node icon={Mic} role="Transcript tap" value={stt} accent="border-border/60" />
          <span className="max-w-[18rem] text-[11px] leading-5 text-muted-foreground">
            Writes the transcript only. The model still hears the caller itself.
          </span>
        </div>
      )}

      {mode === "realtime" && (
        <p className="text-[11px] leading-5 text-muted-foreground">
          One model does all three jobs. There is no separate transcriber or voice to configure.
        </p>
      )}
    </div>
  );
}
