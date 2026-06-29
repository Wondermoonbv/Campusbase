import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
  allOption?: boolean;
  allLabel?: string;
  allValue?: string;
  disabled?: boolean;
  className?: string;
}

const NONE_SENTINEL = "__none__";

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Selecteer...",
  allowNone = false,
  noneLabel = "Geen",
  allOption = false,
  allLabel = "Alle",
  allValue = "all",
  disabled,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();
  const filtered = useMemo(
    () => (term ? options.filter((o) => o.label.toLowerCase().includes(term)) : options),
    [term, options],
  );

  const selectedLabel = (() => {
    if (allOption && value === allValue) return allLabel;
    if (allowNone && value === "") return null;
    return options.find((o) => o.value === value)?.label ?? null;
  })();

  const handleSelect = (v: string) => {
    if (allowNone && v === NONE_SENTINEL) onValueChange("");
    else onValueChange(v);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate text-left", !selectedLabel && "text-muted-foreground")}>
            {selectedLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[240px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Zoeken..." value={search} onValueChange={setSearch} />
          <CommandList className="max-h-72 overflow-y-auto">
            <CommandEmpty>Geen resultaten</CommandEmpty>
            {!term && (allOption || allowNone) && (
              <CommandGroup>
                {allOption && (
                  <CommandItem value={`__all__${allValue}`} onSelect={() => handleSelect(allValue)}>
                    <Check className={cn("mr-2 h-4 w-4", value === allValue ? "opacity-100" : "opacity-0")} />
                    {allLabel}
                  </CommandItem>
                )}
                {allowNone && (
                  <CommandItem value={NONE_SENTINEL} onSelect={() => handleSelect(NONE_SENTINEL)}>
                    <Check className={cn("mr-2 h-4 w-4", value === "" ? "opacity-100" : "opacity-0")} />
                    {noneLabel}
                  </CommandItem>
                )}
              </CommandGroup>
            )}
            <CommandGroup>
              {filtered.map((o) => (
                <CommandItem key={o.value} value={o.value} onSelect={() => handleSelect(o.value)}>
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}