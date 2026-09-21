import { Activity, ShieldAlert } from "lucide-react";
import { urlHost } from "@/lib/formatUrl";
import { cn } from "@/lib/utils";
import type { StrategyItem } from "@/types/inboundContext";
import { isInsecureUrl } from "./strategyValidation";

interface StrategyRowProps {
  strategy: StrategyItem;
  selected: boolean;
  onSelect: () => void;
}

/**
 * One strategy in the list pane. Shows the host it calls, never the full
 * endpoint — a real webhook URL is a hundred characters of path and query that
 * cannot be read in a 350px column and pushes the name off screen. The whole
 * URL stays one hover away, and the detail pane always has it in full.
 */
export function StrategyRow({ strategy, selected, onSelect }: StrategyRowProps) {
  const url = strategy.strategy_config?.url ?? "";
  const host = urlHost(url);
  const insecure = Boolean(url) && isInsecureUrl(url);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      title={url || undefined}
      className={cn(
        "group w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-primary/10 border-primary/30"
          : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border/60",
      )}
    >
      <span
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
        aria-hidden="true"
      >
        <Activity className="h-4 w-4" />
      </span>

      <span className="flex-1 min-w-0">
        <span
          className={cn(
            "block truncate text-sm font-medium",
            selected ? "text-primary" : "text-foreground",
          )}
        >
          {strategy.name}
        </span>
        {/* No globe on every row: an icon repeated four times carries nothing. The
            shield is the one that means something, so it is the one that shows. */}
        <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {insecure && (
            <ShieldAlert
              className="h-3 w-3 shrink-0 status-text-warning"
              aria-label="Not encrypted — this endpoint is plain http"
            />
          )}
          <span className="truncate font-mono">{host || "No endpoint set"}</span>
        </span>
      </span>
    </button>
  );
}
