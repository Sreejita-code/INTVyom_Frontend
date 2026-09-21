import { ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePersistedFlag } from "@/hooks/usePersistedFlag";
import { cn } from "@/lib/utils";

interface MasterDetailShellProps {
  /** When true the detail pane replaces the list pane on screens below `lg`. */
  mobileDetailOpen: boolean;
  list: ReactNode;
  detail: ReactNode;
  /**
   * Enables the desktop collapse toggle and persists the choice under this
   * key. Omit it on pages where the list is the whole point.
   */
  collapseKey?: string;
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
 *
 * With a `collapseKey`, the list pane can be folded away on `lg` and up so the
 * detail pane gets the full width. Collapsing is a desktop affordance only —
 * on a phone `mobileDetailOpen` already gives the detail pane the screen.
 */
export function MasterDetailShell({
  mobileDetailOpen,
  list,
  detail,
  collapseKey,
  className,
  listClassName,
  detailClassName,
}: MasterDetailShellProps) {
  const [collapsed, toggleCollapsed] = usePersistedFlag(
    collapseKey ? `intvyom.list.${collapseKey}` : "",
  );
  const collapsible = Boolean(collapseKey);
  const listHidden = collapsible && collapsed;

  return (
    <div className={cn("page-shell flex", className)}>
      <div
        className={cn(
          "group/pane relative w-full lg:w-80 border-r border-border flex-col bg-card/30",
          mobileDetailOpen ? "hidden lg:flex" : "flex",
          listHidden && "lg:hidden",
          listClassName,
        )}
      >
        {list}
        {collapsible && !collapsed && (
          <PaneToggle label="Collapse list" onClick={toggleCollapsed} className="-right-4 group-hover/pane:opacity-100">
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </PaneToggle>
        )}
      </div>

      <div
        className={cn(
          "group/pane flex-1 min-w-0 relative",
          mobileDetailOpen ? "flex flex-col" : "hidden lg:flex lg:flex-col",
          detailClassName,
        )}
      >
        {listHidden && (
          <PaneToggle label="Expand list" onClick={toggleCollapsed} className="left-2 group-hover/pane:opacity-100">
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          </PaneToggle>
        )}
        {detail}
      </div>
    </div>
  );
}

function PaneToggle({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "hidden lg:flex absolute top-1/2 z-20 h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 transition-all hover:text-foreground hover:border-primary/40 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        className,
      )}
    >
      {children}
    </button>
  );
}
