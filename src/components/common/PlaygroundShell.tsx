import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type PlaygroundTab = "try" | "code" | "reference";

const TABS: { value: PlaygroundTab; label: string }[] = [
  { value: "try", label: "Try it" },
  { value: "code", label: "Code" },
  { value: "reference", label: "Reference" },
];

interface PlaygroundShellProps {
  title: string;
  purpose: string;
  method: string;
  path: string;
  icon?: LucideIcon;
  tabs: Record<PlaygroundTab, ReactNode>;
}

const isTab = (value: string | null): value is PlaygroundTab =>
  TABS.some((tab) => tab.value === value);

/**
 * Header, endpoint chip and the Try it / Code / Reference tabs for one endpoint page. The open tab
 * lives in `?tab=` so a reload or a shared link lands on the same view.
 */
export function PlaygroundShell({
  title,
  purpose,
  method,
  path,
  icon: Icon,
  tabs,
}: PlaygroundShellProps) {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const active: PlaygroundTab = isTab(requested) ? requested : "try";

  const select = (value: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", value);
    setParams(next, { replace: true });
  };

  return (
    <div className="page-shell page-padding content-max space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{purpose}</p>
        <p className="font-mono text-xs text-muted-foreground">
          <span className="status-chip status-chip-info mr-2">{method}</span>
          {path}
        </p>
      </header>

      <Tabs value={active} onValueChange={select}>
        <TabsList className="w-full justify-start sm:w-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            {tabs[tab.value]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
