import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase-helpers";
import type { Program, EventProgram } from "@/types/crm";

export function useOpleidingen() {
  const qc = useQueryClient();

  const { data: opleidingen = [], isLoading } = useQuery({
    queryKey: ["opleidingen"],
    queryFn: async () => {
      const { data, error } = await db("opleidingen").select("*").order("name");
      if (error) { console.error("Error fetching opleidingen:", error); return []; }
      return data as Program[];
    },
  });
  const upsertOpleiding = useMutation({
    mutationFn: async (program: Partial<Program> & { name: string; school_id: string }) => {
      const { school, ...rest } = program as any;
      if (program.id) {
        const { id, ...updates } = rest;
        const { data, error } = await db("opleidingen").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return data as Program;
      } else {
        const { id, ...insert } = rest;
        const { data, error } = await db("opleidingen").insert(insert).select().single();
        if (error) throw error;
        return data as Program;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opleidingen"] }),
  });

  return { opleidingen, isLoading, upsertOpleiding };
}

export function useEventOpleidingen() {
  const qc = useQueryClient();

  const { data: eventOpleidingen = [] } = useQuery({
    queryKey: ["event_opleidingen"],
    queryFn: async () => {
      const { data, error } = await db("event_opleidingen").select("*");
      if (error) throw error;
      return (data as any[]).map((d: any) => ({ event_id: d.event_id, program_id: d.opleiding_id })) as EventProgram[];
    },
  });

  const setEventPrograms = useMutation({
    mutationFn: async ({ eventId, programIds }: { eventId: string; programIds: string[] }) => {
      await db("event_opleidingen").delete().eq("event_id", eventId);
      if (programIds.length > 0) {
        const rows = programIds.map((pid) => ({ event_id: eventId, opleiding_id: pid }));
        const { error } = await db("event_opleidingen").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event_opleidingen"] }),
  });

  return { eventOpleidingen, setEventPrograms };
}
