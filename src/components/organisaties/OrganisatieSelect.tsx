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
import { useScholen } from "@/hooks/useScholen";

interface OrganisatieSelectProps {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
  allOption?: boolean;
  allLabel?: string;
  allValue?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const NONE_SENTINEL = "__none__";

export function OrganisatieSelect({
  value,
  onChange,
  placeholder = "Selecteer een organisatie",
  allowNone = false,
  noneLabel = "Geen",
  allOption = false,
  allLabel = "Alle organisaties",
  allValue = "all",
  required,
  disabled,
  className,
}: OrganisatieSelectProps) {
  const { scholen } = useScholen();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { orgGroups, byId, parentById } = useMemo(() => {
    const sorted = [...scholen].sort((a, b) => a.name.localeCompare(b.name));
    const hoofden = sorted.filter((s) => !s.parent_id);
    const orphanCampuses = sorted.filter(
      (s) => s.parent_id && !hoofden.some((h) => h.id === s.parent_id),
    );
    const groups = [
      ...hoofden.map((h) => ({
        hoofd: h,
        campuses: sorted.filter((s) => s.parent_id === h.id),
      })),
      ...orphanCampuses.map((c) => ({ hoofd: c, campuses: [] })),
    ];
    const map: Record<string, (typeof sorted)[number]> = {};
    sorted.forEach((s) => { map[s.id] = s; });
    const parents: Record<string, string | undefined> = {};
    sorted.forEach((s) => {
      if (s.parent_id && map[s.parent_id]) parents[s.id] = map[s.parent_id].name;
    });
    return { orgGroups: groups, byId: map, parentById: parents };
  }, [scholen]);

  const term = search.trim().toLowerCase();
  const isSearching = term.length > 0;

  const handleSelect = (v: string) => {
    if (allowNone && v === NONE_SENTINEL) onChange("");
    else onChange(v);
    setOpen(false);
    setSearch("");
  };

  const selectedLabel = (() => {
    if (allOption && value === allValue) return allLabel;
    if (allowNone && value === "") return null;
    const s = value ? byId[value] : undefined;
    return s ? s.name : null;
  })();

  const TypeBadge = ({ type }: { type: string }) => (
    <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
      {type}
    </span>
  );

  const flatMatches = useMemo(() => {
    if (!isSearching) return [];
    return Object.values(byId)
      .filter((s) => s.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [term, isSearching, byId]);

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
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[280px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Zoek organisatie..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-72 overflow-y-auto">
            <CommandEmpty>Geen resultaten</CommandEmpty>

            {!isSearching && (allOption || allowNone) && (
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

            {isSearching ? (
              <CommandGroup>
                {flatMatches.map((s) => (
                  <CommandItem key={s.id} value={s.id} onSelect={() => handleSelect(s.id)}>
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", value === s.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{s.name}</span>
                        <TypeBadge type={s.type} />
                      </div>
                      {parentById[s.id] && (
                        <div className="text-xs text-muted-foreground truncate">
                          onder {parentById[s.id]}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <CommandGroup>
                {orgGroups.map(({ hoofd, campuses }) => (
                  <div key={hoofd.id}>
                    <CommandItem value={hoofd.id} onSelect={() => handleSelect(hoofd.id)}>
                      <Check className={cn("mr-2 h-4 w-4 shrink-0", value === hoofd.id ? "opacity-100" : "opacity-0")} />
                      <span className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="truncate">{hoofd.name}</span>
                        <TypeBadge type={hoofd.type} />
                      </span>
                    </CommandItem>
                    {campuses.map((c) => (
                      <CommandItem key={c.id} value={c.id} onSelect={() => handleSelect(c.id)}>
                        <Check className={cn("mr-2 h-4 w-4 shrink-0", value === c.id ? "opacity-100" : "opacity-0")} />
                        <span className="flex items-center gap-2 flex-1 min-w-0 pl-4">
                          <span className="truncate">↳ {c.name}</span>
                          <TypeBadge type={c.type} />
                        </span>
                      </CommandItem>
                    ))}
                  </div>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}