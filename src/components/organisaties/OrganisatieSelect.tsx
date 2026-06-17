import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const orgGroups = useMemo(() => {
    const sorted = [...scholen].sort((a, b) => a.name.localeCompare(b.name));
    const hoofden = sorted.filter((s) => !s.parent_id);
    const orphanCampuses = sorted.filter(
      (s) => s.parent_id && !hoofden.some((h) => h.id === s.parent_id),
    );
    return [
      ...hoofden.map((h) => ({
        hoofd: h,
        campuses: sorted.filter((s) => s.parent_id === h.id),
      })),
      ...orphanCampuses.map((c) => ({ hoofd: c, campuses: [] })),
    ];
  }, [scholen]);

  const selectValue = allowNone && value === "" ? NONE_SENTINEL : value;

  const handleChange = (v: string) => {
    if (allowNone && v === NONE_SENTINEL) onChange("");
    else onChange(v);
  };

  return (
    <Select value={selectValue} onValueChange={handleChange} required={required} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allOption && <SelectItem value={allValue}>{allLabel}</SelectItem>}
        {allowNone && <SelectItem value={NONE_SENTINEL}>{noneLabel}</SelectItem>}
        {orgGroups.map(({ hoofd, campuses }) => (
          <div key={hoofd.id}>
            <SelectItem value={hoofd.id}>
              <span className="flex items-center gap-2">
                <span>{hoofd.name}</span>
                <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {hoofd.type}
                </span>
              </span>
            </SelectItem>
            {campuses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2 pl-6">
                  <span>↳ {c.name}</span>
                  <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {c.type}
                  </span>
                </span>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}