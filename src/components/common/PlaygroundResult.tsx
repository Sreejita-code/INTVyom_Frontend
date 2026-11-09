import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface PlaygroundResultProps {
  children: ReactNode;
}

export function PlaygroundResult({ children }: PlaygroundResultProps) {
  return (
    <section
      aria-label="Result"
      className="overflow-hidden rounded-lg border border-border/60 bg-card/30 xl:sticky xl:top-6"
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-medium text-foreground">Result</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
