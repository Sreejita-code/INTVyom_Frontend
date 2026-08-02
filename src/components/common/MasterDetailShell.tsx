import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MasterDetailShellProps {
  /** When true the detail pane replaces the list pane on screens below `lg`. */
  mobileDetailOpen: boolean;
  list: ReactNode;
  detail: ReactNode;
  /** Extra classes for the outer flex container. */
  className?: string;
  /** Extra classes for the list pane — set the pane width here (e.g. `lg:w-80`). */
  listClassName?: string;
  /** Extra classes for the detail pane. */
  detailClassName?: string;
}

/**
 * Two-pane list/detail layout used by every dashboard page that browses a
 * collection. Both panes are always mounted; below the `lg` breakpoint exactly
 * one of them is visible, chosen by `mobileDetailOpen`.
 */
export function MasterDetailShell({
  mobileDetailOpen,
  list,
  detail,
  className,
  listClassName,
  detailClassName,
}: MasterDetailShellProps) {
  return (
    <div className={cn("page-shell flex", className)}>
      <div
        className={cn(
          "w-full lg:w-80 border-r border-border flex-col bg-card/30",
          mobileDetailOpen ? "hidden lg:flex" : "flex",
          listClassName,
        )}
      >
        {list}
      </div>
      <div
        className={cn(
          "flex-1 relative",
          mobileDetailOpen ? "flex flex-col" : "hidden lg:flex lg:flex-col",
          detailClassName,
        )}
      >
        {detail}
      </div>
    </div>
  );
}
