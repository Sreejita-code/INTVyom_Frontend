import { useEffect, useState } from "react";

import { ApiErrorPanel } from "@/components/common/ApiErrorPanel";
import { UsageSummary } from "@/components/common/UsageSummary";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/apiError";
import type { TtsResult } from "@/types/tts";

interface TtsResultProps {
  result: TtsResult | null;
  error: ApiError | null;
  onUseSample: () => void;
}

/** The audio, its download, and its usage. Plays from an object URL that is revoked on change. */
export function TtsResultView({ result, error, onUseSample }: TtsResultProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!result || typeof URL.createObjectURL !== "function") {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(result.audio);
    setUrl(next);
    return () => URL.revokeObjectURL?.(next);
  }, [result]);

  if (error) return <ApiErrorPanel error={error} />;

  if (!result) {
    return (
      <div className="space-y-3 py-2 text-sm text-muted-foreground">
        <p>Your audio and its usage will appear here.</p>
        <Button variant="outline" size="sm" onClick={onUseSample}>
          Use a sample sentence
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {url ? (
        <audio
          controls
          src={url}
          aria-label="Generated speech"
          className="w-full"
        />
      ) : null}
      {url ? (
        <a className="text-sm underline" href={url} download="speech.wav">
          Download audio
        </a>
      ) : null}
      {result.usage ? (
        <UsageSummary
          pricingComplete={result.usage.pricingComplete}
          rows={[
            { label: "Characters", value: result.usage.charactersCount },
            {
              label: "Audio duration",
              value: result.usage.audioDurationSeconds,
              unit: "s",
            },
            {
              label: "Estimated cost",
              value: result.usage.estimatedCostUsd,
              unit: "USD",
            },
          ]}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Usage is only available with the JSON format, because the audio
          response does not expose its usage headers to the browser.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Provider {result.provider || "not reported"}, model{" "}
        {result.model ?? "not reported"}.
      </p>
    </div>
  );
}
