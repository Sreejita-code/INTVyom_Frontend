import { useMemo, useState } from "react";
import { Braces, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MetadataRow } from "@/lib/callMetadata";

interface MetadataEditorProps {
  rows: MetadataRow[];
  onRowsChange: (rows: MetadataRow[]) => void;
  rawJson: string;
  onRawJsonChange: (value: string) => void;
  useRaw: boolean;
  onUseRawChange: (value: boolean) => void;
  /** Copy above the rows — differs between an agent call and a passthrough call. */
  blurb: string;
  className?: string;
}

/**
 * The `metadata` object sent with a call.
 *
 * Two entry modes because two things are true at once: most metadata is a handful of flat strings,
 * which rows handle better than JSON, but the placeholder syntax genuinely supports nesting and
 * arrays, which rows cannot express. Dotted keys cover the common nested case (`customer.name`
 * becomes `{customer: {name}}`); raw JSON covers the rest.
 */
export function MetadataEditor({
  rows,
  onRowsChange,
  rawJson,
  onRawJsonChange,
  useRaw,
  onUseRawChange,
  blurb,
  className,
}: MetadataEditorProps) {
  const [touchedRaw, setTouchedRaw] = useState(false);

  const rawError = useMemo(() => {
    if (!useRaw || !touchedRaw || !rawJson.trim()) return undefined;
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return "Metadata has to be a JSON object, so placeholders have keys to read.";
      }
      return undefined;
    } catch (e) {
      return (e as Error).message;
    }
  }, [rawJson, touchedRaw, useRaw]);

  const setRow = (index: number, patch: Partial<MetadataRow>) =>
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 gap-1">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Braces className="h-3.5 w-3.5 text-primary" />
            Variables
          </span>
          <p className="max-w-prose text-[0.8125rem] leading-6 text-muted-foreground">{blurb}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground"
          onClick={() => onUseRawChange(!useRaw)}
        >
          {useRaw ? "Use rows" : "Use raw JSON"}
        </Button>
      </div>

      {useRaw ? (
        <div className="grid gap-1.5">
          <Textarea
            aria-label="Metadata JSON"
            spellCheck={false}
            placeholder={'{\n  "customer": { "name": "John Doe" },\n  "agent_name": "Sarah"\n}'}
            className="min-h-[9rem] resize-y font-mono text-sm"
            value={rawJson}
            onChange={(e) => {
              setTouchedRaw(true);
              onRawJsonChange(e.target.value);
            }}
          />
          {rawError && <p className="text-[0.8125rem] leading-6 text-destructive">{rawError}</p>}
        </div>
      ) : (
        <div className="grid gap-2">
          {rows.length === 0 && (
            <p className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-[0.8125rem] leading-6 text-muted-foreground">
              Nothing to fill in. Add a key here, or write <code className="font-mono">{"{{name}}"}</code> in the
              assistant's prompt and it will show up as a row.
            </p>
          )}

          {rows.map((row, index) => (
            <div key={`${row.key}-${index}`} className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
              <Input
                aria-label={`Variable ${index + 1} key`}
                value={row.key}
                readOnly={row.fromPrompt}
                placeholder="customer.name"
                onChange={(e) => setRow(index, { key: e.target.value })}
                className={cn(
                  "min-w-0 flex-1 font-mono text-sm sm:max-w-[16rem]",
                  row.fromPrompt && "border-dashed bg-muted/30 text-muted-foreground",
                )}
              />
              <Input
                aria-label={`Value for ${row.key || `variable ${index + 1}`}`}
                value={row.value}
                placeholder={row.optional ? "optional" : "value"}
                onChange={(e) => setRow(index, { value: e.target.value })}
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${row.key || `variable ${index + 1}`}`}
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRowsChange(rows.filter((_, i) => i !== index))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => onRowsChange([...rows, { key: "", value: "" }])}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add variable
          </Button>
        </div>
      )}
    </div>
  );
}
