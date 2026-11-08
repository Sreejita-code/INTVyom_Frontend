import { useState } from "react";

import { ApiErrorPanel } from "@/components/common/ApiErrorPanel";
import { UsageSummary } from "@/components/common/UsageSummary";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/apiError";
import type { LlmResult } from "@/types/llm";

export interface StreamState {
  text: string;
  events: string[];
  status: "streaming" | "finished" | "stopped";
}

interface LlmResultProps {
  result: LlmResult | null;
  stream: StreamState | null;
  error: ApiError | null;
}

/** The reply: either the finished JSON result or the live stream, with its raw events on request. */
export function LlmResultView({ result, stream, error }: LlmResultProps) {
  const [showRaw, setShowRaw] = useState(false);

  if (error) return <ApiErrorPanel error={error} />;

  if (stream) {
    return (
      <div className="space-y-4">
        <div aria-live="polite" className="whitespace-pre-wrap rounded-lg border border-border p-4 text-sm text-foreground min-h-24">
          {stream.text}
        </div>
        {stream.status === "finished" ? <p className="text-sm text-muted-foreground">Stream finished.</p> : null}
        {stream.status === "stopped" ? (
          <p className="text-sm text-muted-foreground">Stopped. The text above is cut off.</p>
        ) : null}
        <Button variant="outline" size="sm" aria-expanded={showRaw} onClick={() => setShowRaw((v) => !v)}>
          {showRaw ? "Hide raw events" : "Show raw events"}
        </Button>
        {showRaw ? (
          <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background p-3 text-xs font-mono">
            {stream.events.join("\n\n")}
          </pre>
        ) : null}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        The reply and its usage will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="whitespace-pre-wrap rounded-lg border border-border p-4 text-sm text-foreground">
        {result.message.content}
      </div>
      <UsageSummary
        pricingComplete={result.usage.pricingComplete}
        rows={[
          { label: "Prompt tokens", value: result.usage.promptTokens },
          { label: "Completion tokens", value: result.usage.completionTokens },
          { label: "Total tokens", value: result.usage.totalTokens },
          { label: "Estimated cost", value: result.usage.estimatedCostUsd, unit: "USD" },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Provider {result.provider || "not reported"}, model {result.model ?? "not reported"}.
      </p>
    </div>
  );
}
