import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEventOrganisaties(eventId?: string) {
  const qc = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["event_organisaties", eventId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("event_organisaties").select("event_id, organisatie_id");
      if (eventId) q = q.eq("event_id", eventId);
      const { data, error } = await q;
      if (error) { console.error("event_organisaties fetch:", error); return []; }
      return (data ?? []) as { event_id: string; organisatie_id: string }[];
    },
    staleTime: 30_000,
  });

  const syncOrganisaties = useMutation({
    mutationFn: async ({ eventId, organisatieIds }: { eventId: string; organisatieIds: string[] }) => {
      const { data: existing, error: fetchErr } = await supabase
        .from("event_organisaties")
        .select("organisatie_id")
        .eq("event_id", eventId);
      if (fetchErr) throw fetchErr;
      const current = new Set((existing ?? []).map((r: any) => r.organisatie_id));
      const next = new Set(organisatieIds);
      const toAdd = [...next].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !next.has(id));
      if (toAdd.length) {
        const { error } = await supabase.from("event_organisaties").insert(toAdd.map((organisatie_id) => ({ event_id: eventId, organisatie_id })));
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase.from("event_organisaties").delete().eq("event_id", eventId).in("organisatie_id", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["event_organisaties", vars.eventId] });
      qc.invalidateQueries({ queryKey: ["event_organisaties", "all"] });
    },
  });

  return { links, isLoading, syncOrganisaties };
}