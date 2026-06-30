import { useMemo } from "react";
import { useScholen } from "@/hooks/useScholen";
import type { School } from "@/types/crm";

interface OrganisatieLabelProps {
  organisatieId?: string | null;
  organisatie?: Partial<School> | null;
}

export function OrganisatieLabel({ organisatieId, organisatie }: OrganisatieLabelProps) {
  const { scholen } = useScholen();
  const org = useMemo(
    () => organisatie ?? (organisatieId ? scholen.find((s) => s.id === organisatieId) : null),
    [organisatie, organisatieId, scholen]
  );
  const parentName = useMemo(() => {
    if (organisatie?.parent?.name) return organisatie.parent.name;
    if (org?.parent_id) return scholen.find((s) => s.id === org.parent_id)?.name;
    return null;
  }, [organisatie, org, scholen]);

  if (!org?.parent_id || !parentName) return null;
  return <span className="text-xs text-muted-foreground block mt-0.5">onder {parentName}</span>;
}
