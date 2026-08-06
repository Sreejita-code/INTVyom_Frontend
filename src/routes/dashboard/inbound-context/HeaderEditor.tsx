import { Lock, Plus, RotateCcw, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { HeaderRow, emptyHeaderRow } from "./headerDiff";

interface HeaderEditorProps {
  rows: HeaderRow[];
  onChange: (rows: HeaderRow[]) => void;
}

export function HeaderEditor({ rows, onChange }: HeaderEditorProps) {
  const patch = (id: string, changes: Partial<HeaderRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...changes } : row)));

  // Renaming a masked row means the old key is deleted and the new one has to carry a
  // value — and the browser never had the secret, so the user has to re-enter it.
  const renameRow = (row: HeaderRow, key: string) =>
    patch(row.id, row.masked && !row.dirty ? { key, dirty: true, value: "" } : { key });

  const removeRow = (row: HeaderRow) => {
    // A row that never reached the server can just disappear; a stored one has to be sent
    // back as null to be deleted, so it stays visible until save.
    if (!row.originalKey) {
      onChange(rows.filter((r) => r.id !== row.id));
      return;
    }
    patch(row.id, { removed: true });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Custom Headers <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onChange([...rows, emptyHeaderRow()])}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add header
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No headers. Add one if your endpoint needs authentication.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center gap-2",
                row.removed && "opacity-50",
              )}
            >
              <Input
                placeholder="Header name"
                value={row.key}
                disabled={row.removed}
                onChange={(e) => renameRow(row, e.target.value)}
                className="bg-background font-mono text-xs sm:w-[40%]"
              />

              {row.masked && !row.dirty ? (
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/40 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-mono">•••• saved</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs shrink-0"
                    disabled={row.removed}
                    onClick={() => patch(row.id, { dirty: true, value: "" })}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Replace
                  </Button>
                </div>
              ) : (
                <Input
                  placeholder="Value"
                  value={row.value}
                  disabled={row.removed}
                  onChange={(e) => patch(row.id, { value: e.target.value, dirty: true })}
                  className="bg-background font-mono text-xs flex-1"
                />
              )}

              {row.removed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs shrink-0"
                  onClick={() => patch(row.id, { removed: false })}
                >
                  <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove header ${row.key || ""}`.trim()}
                  onClick={() => removeRow(row)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Saved secrets are never shown again. Only headers you edit here are sent — everything else
        keeps its stored value.
      </p>
    </div>
  );
}
