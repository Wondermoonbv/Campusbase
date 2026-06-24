import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboOption {
  nr: string;
  name: string;
}

interface Props {
  value: string; // selected nr (or "")
  selectedLabel?: string;
  placeholder: string;
  searchPlaceholder?: string;
  onChange: (nr: string, name: string) => void;
  onSearchChange: (term: string) => void;
  options: ComboOption[];
  isLoading?: boolean;
  className?: string;
}

export function SearchableComboFilter({
  value,
  selectedLabel,
  placeholder,
  searchPlaceholder = "Typ om te zoeken…",
  onChange,
  onSearchChange,
  options,
  isLoading,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setTerm(""); onSearchChange(""); } }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-10 sm:h-9 justify-between font-normal", className)}
        >
          <span className={cn("truncate text-left", !value && "text-muted-foreground")}>
            {value && selectedLabel ? selectedLabel : placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {value && (
              <span
                role="button"
                aria-label="Filter wissen"
                className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-muted"
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange("", ""); }}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]" align="start">
        <div className="p-2 border-b border-border">
          <Input
            autoFocus
            placeholder={searchPlaceholder}
            value={term}
            onChange={(e) => { setTerm(e.target.value); onSearchChange(e.target.value); }}
            className="h-9"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Laden…
            </div>
          ) : options.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">Geen resultaten</div>
          ) : (
            options.map((o) => (
              <button
                key={o.nr}
                type="button"
                onClick={() => { onChange(o.nr, o.name); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 flex items-center gap-2"
              >
                <Check className={cn("h-3.5 w-3.5", value === o.nr ? "opacity-100" : "opacity-0")} />
                <span className="truncate flex-1">{o.name || `(zonder naam) ${o.nr}`}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{o.nr}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}