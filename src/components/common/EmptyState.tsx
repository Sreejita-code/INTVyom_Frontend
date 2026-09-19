import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Extra classes for the outer container. */
  className?: string;
  /** Extra classes for the description, e.g. a wider `max-w-*`. */
  descriptionClassName?: string;
  /** Compact variant for stacking under onboarding content. */
  compact?: boolean;
}

/**
 * The "nothing selected yet" panel shown in the detail pane of a
 * {@link MasterDetailShell} before the user picks a row.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  descriptionClassName,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 relative z-10 animate-in fade-in duration-500",
        className,
      )}
    >
      <div className={cn(
        "rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10",
        compact ? "w-14 h-14 mb-3" : "w-24 h-24 mb-6",
      )}>
        <Icon className={compact ? "h-7 w-7 text-primary/30" : "h-10 w-10 text-primary/30"} />
      </div>
      <h2 className={compact ? "text-xl font-bold text-foreground mb-2" : "text-2xl font-bold text-foreground mb-2"}>{title}</h2>
      <p
        className={cn(
          "max-w-xs text-center text-sm text-muted-foreground leading-relaxed",
          descriptionClassName,
        )}
      >
        {description}
      </p>
    </div>
  );
}
