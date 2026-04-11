import { useMemo } from "react";
import { useAllInschrijvingen } from "@/hooks/useAmbassadeurs";

export function usePendingInschrijvingenCount() {
  const { inschrijvingen } = useAllInschrijvingen();

  const count = useMemo(() => {
    return inschrijvingen.filter(
      (i) => i.status === "ingeschreven" || i.status === "uitgenodigd"
    ).length;
  }, [inschrijvingen]);

  return count;
}
