import { useState, type ReactNode } from "react";
import { ChevronDown, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OptionalConfigurationProps {
  children: ReactNode;
  active?: boolean;
}

export function OptionalConfiguration({
  children,
  active = false,
}: OptionalConfigurationProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-lg border border-border/60 bg-card/20">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-between rounded-none px-4 py-3 text-left hover:bg-muted/40"
        aria-label="Optional configuration"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Settings2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-medium text-foreground">
              Optional configuration
            </span>
            <span className="block text-xs font-normal text-muted-foreground">
              {active
                ? "Overrides are active"
                : "Assistant defaults and a one-request provider key"}
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </Button>
      {open ? (
        <div className="space-y-4 border-t border-border/60 p-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
