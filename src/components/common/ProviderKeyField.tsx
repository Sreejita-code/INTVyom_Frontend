import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProviderKeyFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Optional provider key, sent only as `X-Provider-API-Key` on this request. Held by the caller in
 * component state; this field never writes to browser storage.
 */
export function ProviderKeyField({ value, onChange }: ProviderKeyFieldProps) {
  const id = "provider-api-key";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Provider API key (optional)</Label>
      <Input
        id={id}
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="font-mono"
      />
      <p className="text-xs text-muted-foreground">
        Used only for this request, then dropped. Leave blank to use the key stored under Provider Keys.
      </p>
    </div>
  );
}
