import { ReactNode } from "react";
import { Check, ChevronRight, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface JsonSampleProps {
  /** What the block shows, e.g. "What we POST to this URL". */
  title: string;
  /** Rendered with `JSON.stringify(value, null, 2)`. */
  value: unknown;
  /** The part of the contract the shape alone does not say — retries, fallback, placeholders. */
  note?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * A collapsed, copyable JSON sample sitting under the field it documents.
 *
 * A native `<details>` rather than a Radix collapsible: no state to own, and the summary is
 * focusable and announced as expandable without any ARIA of our own. The copy button lives in
 * the body — inside `<summary>` it would be an interactive element inside an interactive one.
 */
export const JsonSample = ({ title, value, note, defaultOpen, className }: JsonSampleProps) => {
  const { copied, copy } = useCopyToClipboard(1500);
  const { toast } = useToast();
  const json = JSON.stringify(value, null, 2);

  const copyJson = async () => {
    const ok = await copy(json);
    if (!ok) toast({ variant: "destructive", title: "Error", description: "Could not copy the sample" });
  };

  return (
    <details
      open={defaultOpen}
      className={cn("group rounded-lg border border-border/60 bg-muted/20", className)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden rounded-lg px-3 py-2 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
        <span className="min-w-0 break-words">{title}</span>
      </summary>

      <div className="space-y-3 border-t border-border/60 p-3">
        {note && (
          <p className="max-w-prose text-pretty break-words text-xs leading-6 text-muted-foreground">
            {note}
          </p>
        )}

        <div className="relative">
          {/* A plain overflow container rather than Radix ScrollArea: its viewport is `h-full`, so
              it does not scroll under a `max-h` parent, and these samples vary from `{}` to a
              hundred lines. Native scrolling handles both without a fixed height. */}
          <div className="max-h-80 overflow-auto rounded-lg border border-border bg-background">
            <pre className="p-4 pr-16 text-xs font-mono leading-relaxed text-foreground">{json}</pre>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyJson}
            className="absolute right-2 top-2 h-7 px-2"
          >
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </details>
  );
};
