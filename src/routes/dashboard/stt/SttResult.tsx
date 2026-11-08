import { ApiErrorPanel } from "@/components/common/ApiErrorPanel";
import { UsageSummary } from "@/components/common/UsageSummary";
import type { ApiError } from "@/lib/apiError";
import type { SttResult } from "@/types/stt";

interface SttResultProps {
  result: SttResult | null;
  error: ApiError | null;
}

export function SttResultView({ result, error }: SttResultProps) {
  if (error) return <ApiErrorPanel error={error} />;
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Your transcript and its usage will appear here.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="whitespace-pre-wrap rounded-lg border border-border p-4 text-sm text-foreground">{result.text}</p>
      <UsageSummary
        pricingComplete={result.usage.pricingComplete}
        rows={[
          { label: "Duration", value: result.durationSeconds, unit: "s" },
          { label: "Audio duration", value: result.usage.audioDurationSeconds, unit: "s" },
          { label: "Estimated cost", value: result.usage.estimatedCostUsd, unit: "USD" },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Detected language {result.language ?? "not reported"}. Provider {result.provider || "not reported"}, model{" "}
        {result.model ?? "not reported"}.
      </p>
    </div>
  );
}
