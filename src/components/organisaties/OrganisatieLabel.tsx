import { useMemo } from "react";
import { useScholen } from "@/hooks/useScholen";

interface OrganisatieLabelProps {
  organisatieId?: string | null;
}

export function OrganisatieLabel({ organisatieId }: OrganisatieLabelProps) {
  const { scholen } = useScholen();
  const org = useMemo(() => scholen.find((s) => s.id === organisatieId), [scholen, organisatieId]);
  const parent = useMemo(() => (org?.parent_id ? scholen.find((s) => s.id === org.parent_id) : null), [scholen, org]);

  if (!org?.parent_id || !parent) return null;
  return <span className="text-xs text-muted-foreground block mt-0.5">onder {parent.name}</span>;
}
