import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatUsd } from "@/lib/formatUsd";
import { CallUsage, CallUsageLine } from "@/types/callLog";

function kindLabel(type: string) {
  if (type === "llm") return "LLM";
  if (type === "tts") return "TTS";
  if (type === "stt") return "STT";
  return type.toUpperCase();
}

function lineMetric(line: CallUsageLine) {
  if (line.type === "llm") {
    const parts: string[] = [];
    if (line.inputTokens != null) parts.push(`${line.inputTokens.toLocaleString()} in`);
    if (line.outputTokens != null) parts.push(`${line.outputTokens.toLocaleString()} out`);
    return parts.length ? parts.join(" · ") : null;
  }
  if (line.type === "tts" && line.charactersCount != null) {
    return `${line.charactersCount.toLocaleString()} chars`;
  }
  if (line.audioDuration != null) {
    return `${line.audioDuration.toFixed(1)}s audio`;
  }
  return null;
}

export default function CallLogCost({ usage }: { usage: CallUsage | null }) {
  const total = usage ? formatUsd(usage.estimatedCostUsd) : null;
  if (!usage || total === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-1 font-mono text-sm tabular-nums"
        >
          {total}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-3 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Estimated cost
        </p>
        <ul className="space-y-2">
          {usage.lines.map((line, index) => {
            const metric = lineMetric(line);
            const amount = formatUsd(line.estimatedCostUsd) ?? "—";
            return (
              <li key={`${line.type}-${line.model}-${index}`} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium">{kindLabel(line.type)}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {[line.provider, line.model].filter(Boolean).join(" · ") || "Unknown model"}
                  </div>
                  {metric && (
                    <div className="text-[11px] text-muted-foreground">{metric}</div>
                  )}
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums">{amount}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-border/60 pt-2">
          <span className="text-xs font-medium">Total</span>
          <span className="font-mono text-sm tabular-nums">{total}</span>
        </div>
        {!usage.pricingComplete && (
          <p className="text-[11px] text-muted-foreground">Pricing incomplete</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
