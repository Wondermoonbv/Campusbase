import { useEffect, useState } from "react";
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
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AsyncOrganisatieSelectProps {
  value: string;
  onValueChange: (id: string) => void;
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
  allOption?: boolean;
  allLabel?: string;
  allValue?: string;
  onlyHoofd?: boolean;
  excludeId?: string;
  disabled?: boolean;
  className?: string;
}

interface OrgRow {
  id: string;
  name: string;
  parent_id: string | null;
  parent?: { name: string } | null;
}

const NONE_SENTINEL = "__none__";

export function AsyncOrganisatieSelect({
  value,
  onValueChange,
  placeholder = "Selecteer een organisatie",
  allowNone = false,
  noneLabel = "Geen",
  allOption = false,
  allLabel = "Alle organisaties",
  allValue = "all",
  onlyHoofd = false,
  excludeId,
  disabled,
  className,
}: AsyncOrganisatieSelectProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // Debounce term
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  // Fetch label for current value
  useEffect(() => {
    let cancelled = false;
    if (!value || (allOption && value === allValue)) {
      setSelectedLabel(null);
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("organisaties")
        .select("name")
        .eq("id", value)
        .maybeSingle();
      if (!cancelled) setSelectedLabel(data?.name ?? null);
    })();
    return () => { cancelled = true; };
  }, [value, allOption, allValue]);

  // Server-side search
  useEffect(() => {
    if (!open || !debounced) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = (supabase as any)
        .from("organisaties")
        .select("id, name, parent_id, parent:organisaties!parent_id(name)")
        .ilike("name", `%${debounced}%`)
        .order("name")
        .limit(50);
      if (onlyHoofd) q = q.is("parent_id", null);
      if (excludeId) q = q.neq("id", excludeId);
      const { data, error } = await q;
      if (!cancelled) {
        if (error) setResults([]);
        else setResults((data as OrgRow[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, debounced, onlyHoofd, excludeId]);

  const handleSelect = (v: string) => {
    if (allowNone && v === NONE_SENTINEL) onValueChange("");
    else onValueChange(v);
    setOpen(false);
    setTerm("");
  };

  const triggerLabel = (() => {
    if (allOption && value === allValue) return allLabel;
    if (!value) return null;
    return selectedLabel;
  })();

  return (
    <Popover open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); if (!o) setTerm(""); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate text-left", !triggerLabel && "text-muted-foreground")}>
            {triggerLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[280px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Zoek organisatie..."
            value={term}
            onValueChange={setTerm}
          />
          <CommandList className="max-h-72 overflow-y-auto">
            {(allOption || allowNone) && (
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

            {!debounced ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Typ om te zoeken
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Laden...
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty>Geen resultaten</CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((r) => (
                  <CommandItem key={r.id} value={r.id} onSelect={() => handleSelect(r.id)}>
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", value === r.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{r.name}</div>
                      {r.parent_id && r.parent?.name && (
                        <div className="text-xs text-muted-foreground truncate">
                          onder {r.parent.name}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
                {results.length === 50 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-border">
                    Verfijn je zoekopdracht voor meer resultaten
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}