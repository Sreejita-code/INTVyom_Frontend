import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SuggestionInputProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  formatOption?: (value: string) => string;
  mono?: boolean;
}

export function SuggestionInput({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  formatOption = (option) => option,
  mono = false,
}: SuggestionInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex">
        <Input
          id={id}
          name={id}
          autoComplete="off"
          className={cn("min-w-0 flex-1 rounded-r-none", mono && "font-mono")}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 rounded-l-none border-l-0"
              aria-label={`Browse ${label} suggestions`}
              aria-expanded={open}
              disabled={options.length === 0}
            >
              <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <Command>
              <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
              <CommandList>
                <CommandEmpty>
                  No known values found. You can type a custom value.
                </CommandEmpty>
                <CommandGroup heading="Known values">
                  {options.map((option) => {
                    const display = formatOption(option);
                    return (
                      <CommandItem
                        key={option}
                        value={`${display} ${option}`}
                        onSelect={() => {
                          onChange(option);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === option ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="min-w-0">
                          <span className="block truncate">{display}</span>
                          {display !== option ? (
                            <span className="block truncate font-mono text-xs text-muted-foreground">
                              {option}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
