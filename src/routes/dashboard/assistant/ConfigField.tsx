import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { FieldRow } from "./FieldRow";
import { TRIGGER_ONE_LINE } from "./StageSection";
import { FieldSpec } from "./providerCatalog";

/**
 * Stands in for an option whose real value is the empty string.
 *
 * Radix reserves `""` for "nothing selected, show the placeholder" and throws if a `SelectItem`
 * carries it. That throw unmounts the whole editor — it is what a blank page after picking a
 * provider actually was. Some upstream fields genuinely mean the empty string, though: ElevenLabs
 * `language_code` uses it for auto-detect. So `""` is swapped for this sentinel on the way in and
 * swapped back on the way out, and nothing outside this file ever sees it.
 */
const EMPTY_OPTION = "__empty__";

interface ConfigFieldProps {
  spec: FieldSpec;
  value: any;
  onChange: (value: any) => void;
  /** Set when this provider or model throws the value away — the control stays readable but dead. */
  inertReason?: string;
}

/**
 * One knob, rendered from its spec. Layout, explanation and warning all come from `FieldRow`,
 * so the three-part rhythm holds across every provider without each section restating it.
 */
export function ConfigField({ spec, value, onChange, inertReason }: ConfigFieldProps) {
  const disabled = Boolean(inertReason);
  const current = value ?? spec.fallback;

  const control = () => {
    switch (spec.control) {
      case "switch":
        return (
          <Switch
            checked={Boolean(current)}
            onCheckedChange={onChange}
            disabled={disabled}
            aria-label={spec.label}
          />
        );

      case "slider":
        return (
          <div className="flex items-center gap-4">
            <Slider
              value={[Number(current ?? spec.min ?? 0)]}
              min={spec.min}
              max={spec.max}
              step={spec.step}
              disabled={disabled}
              onValueChange={([next]) => onChange(next)}
              aria-label={spec.label}
              className="flex-1"
            />
            <span className="w-12 shrink-0 rounded-md border border-border/60 bg-background/60 py-1 text-center font-mono text-xs tabular-nums text-foreground/90">
              {Number(current ?? 0).toFixed(2)}
            </span>
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            aria-label={spec.label}
            min={spec.min}
            max={spec.max}
            step={spec.step}
            disabled={disabled}
            placeholder={spec.placeholder}
            value={current ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          />
        );

      case "select":
        return (
          <Select
            value={current === undefined || current === null ? "" : String(current) || EMPTY_OPTION}
            onValueChange={(next) => onChange(next === EMPTY_OPTION ? "" : next)}
            disabled={disabled}
          >
            <SelectTrigger aria-label={spec.label} className={TRIGGER_ONE_LINE}>
              <SelectValue placeholder={spec.placeholder ?? "Select"} />
            </SelectTrigger>
            <SelectContent className="max-w-[min(22rem,calc(100vw-2rem))]">
              {spec.options?.map((option) => (
                <SelectItem key={option.value} value={option.value || EMPTY_OPTION}>
                  <span className="flex flex-col gap-0.5 py-0.5">
                    <span className={cn("text-sm", spec.mono && "font-mono")}>{option.label}</span>
                    {option.hint && (
                      <span data-tagline className="text-xs leading-5 text-muted-foreground">
                        {option.hint}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            aria-label={spec.label}
            disabled={disabled}
            placeholder={spec.placeholder}
            value={current ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={cn(spec.mono && "font-mono text-sm")}
          />
        );
    }
  };

  return (
    <FieldRow
      label={spec.label}
      required={spec.required}
      help={spec.help}
      warn={spec.warn}
      note={inertReason}
      inline={spec.control === "switch"}
      control={control()}
    />
  );
}
