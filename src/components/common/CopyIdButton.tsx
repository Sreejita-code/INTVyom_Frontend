import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";

interface CopyIdButtonProps {
  /** The exact value written to the clipboard. */
  value: string;
  /** Human label, e.g. "Assistant ID" — used for the aria-label and the toast. */
  label: string;
  /** Shown instead of `value` (e.g. a masked secret). The full `value` is still copied. */
  displayValue?: string;
  className?: string;
}

/**
 * One copy-to-clipboard button used everywhere an ID or key is shown.
 */
export function CopyIdButton({ value, label, displayValue, className }: CopyIdButtonProps) {
  const { toast } = useToast();
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = async () => {
    const ok = await copy(value);
    if (ok) toast({ title: "Copied!", description: `${label} copied to clipboard.` });
    else toast({ variant: "destructive", title: "Error", description: `Could not copy the ${label}` });
  };

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <code className="font-mono truncate" title={displayValue ?? value}>
        {displayValue ?? value}
      </code>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary bg-muted/30 rounded-md"
      >
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </Button>
    </span>
  );
}
