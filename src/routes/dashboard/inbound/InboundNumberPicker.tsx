import { useId } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ExotelNumber } from "@/types/sip";
import { isPhoneLike } from "./phoneNumber";

interface InboundNumberPickerProps {
  numbers: ExotelNumber[];
  value: string;
  onChange: (number: string) => void;
}

export function InboundNumberPicker({ numbers, value, onChange }: InboundNumberPickerProps) {
  const listId = useId();
  const invalid = value.trim() !== "" && !isPhoneLike(value);

  return (
    <div className="space-y-2">
      <Input
        type="tel"
        inputMode="tel"
        autoComplete="off"
        role="combobox"
        aria-label="Exotel number"
        aria-invalid={invalid || undefined}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="+918044319240"
        className={cn("h-11 bg-muted/30 font-mono", invalid && "border-destructive focus-visible:ring-destructive")}
      />
      <datalist id={listId}>
        {numbers.map((n) => (
          <option key={n.number} value={n.number}>
            {n.name}
          </option>
        ))}
      </datalist>
      <p className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>
        {invalid
          ? "Use digits only, e.g. +918044319240."
          : "The full number, with the country code."}
      </p>
    </div>
  );
}
