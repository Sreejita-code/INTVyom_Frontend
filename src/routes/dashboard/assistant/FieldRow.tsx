import { ReactNode } from "react";
import { AlertTriangle, Ban } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldRowProps {
  label: string;
  /** The id of the control, so clicking the label focuses it and screen readers pair them. */
  htmlFor?: string;
  required?: boolean;
  /** What this control does on a real call. */
  help?: ReactNode;
  /** The trap — a value that silently does nothing, costs money, or means the opposite. */
  warn?: ReactNode;
  /** Set when the current selection makes this control inert. Also dims the row. */
  note?: ReactNode;
  control: ReactNode;
  /** Switches sit beside their label rather than under it. */
  inline?: boolean;
  /**
   * Put the control on its own full-width line under the label instead of in the 17rem column.
   *
   * For values that are long by nature — a webhook URL, a spoken sentence — a 17rem box shows a
   * sliver of the value and nothing else. Those fields need the width more than the layout needs
   * the symmetry.
   */
  wide?: boolean;
}

/**
 * One row of the editor: what it is on the left, what changes it on the right.
 *
 * The two-column split is the whole point — an explanation that has to compete with its own
 * control for width ends up as a cramped caption nobody reads. Below `sm` the columns stack,
 * keeping the same order. `wide` opts a row out entirely; see the prop.
 */
export function FieldRow({ label, htmlFor, required, help, warn, note, control, inline, wide }: FieldRowProps) {
  return (
    <div className={cn("grid gap-3 py-5 first:pt-0 last:pb-0", note && "opacity-60")}>
      {/* Both tracks are minmax(0, …): a bare `17rem` track is a *minimum* as well as a maximum, so
          a long select value used to push the row wider than its card instead of shrinking. */}
      <div
        className={cn(
          "grid gap-3",
          !wide && "sm:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] sm:items-start sm:gap-8",
        )}
      >
        <div className="grid min-w-0 gap-2">
          <Label htmlFor={htmlFor} className="text-sm font-medium leading-snug">
            {label}
            {required && <span className="ml-1 text-primary">*</span>}
          </Label>
          {help && (
            <p className="max-w-prose text-pretty break-words text-xs leading-5 text-muted-foreground">
              {help}
            </p>
          )}
        </div>

        <div className={cn("min-w-0", inline && "sm:flex sm:justify-end sm:pt-1")}>{control}</div>
      </div>

      {warn && (
        <p className="status-alert-warning flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-5">
          <AlertTriangle className="mt-1 h-3 w-3 shrink-0" />
          <span className="min-w-0 break-words">{warn}</span>
        </p>
      )}

      {note && (
        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <Ban className="mt-1 h-3 w-3 shrink-0" />
          <span className="min-w-0 break-words">{note}</span>
        </p>
      )}
    </div>
  );
}
