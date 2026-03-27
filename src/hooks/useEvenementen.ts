import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase-helpers";
import type { Event } from "@/types/crm";

function mapTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.length > 5 ? t.slice(0, 5) : t;
}

function mapEvent(row: any): Event {
  return {
    ...row,
    start_time: mapTime(row.start_time),
    end_time: mapTime(row.end_time),
    setup_time: mapTime(row.setup_time),
    setup_date: row.setup_date ?? "",
    budget: row.budget != null ? Number(row.budget) : null,
    team_members: row.team_members ?? [],
    school_id: row.school_id ?? null,
  };
}

export function useEvenementen() {
  const qc = useQueryClient();

  const { data: evenementen = [], isLoading } = useQuery({
    queryKey: ["evenementen"],
    queryFn: async () => {
      const { data, error } = await db("evenementen").select("*").order("date", { ascending: true });
      if (error) throw error;
      return (data as any[]).map(mapEvent);
    },
  });

  const upsertEvent = useMutation({
    mutationFn: async (event: Partial<Event> & { name: string }) => {
      const { school, target_program_ids, ...rest } = event as any;
      // Normalize budget and school_id
      const payload: any = { ...rest };
      if (payload.budget === "" || payload.budget === undefined) payload.budget = null;
      if (payload.school_id === "" || payload.school_id === "none") payload.school_id = null;
      if (payload.start_time === "") payload.start_time = null;
      if (payload.end_time === "") payload.end_time = null;
      if (payload.setup_date === "") payload.setup_date = null;
      if (payload.setup_time === "") payload.setup_time = null;

      if (event.id) {
        const { id, created_at, ...updates } = payload;
        const { data, error } = await db("evenementen").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return mapEvent(data);
      } else {
        const { id, created_at, ...insert } = payload;
        const { data, error } = await db("evenementen").insert(insert).select().single();
        if (error) throw error;
        return mapEvent(data);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evenementen"] }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db("evenementen").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evenementen"] }),
  });

  return { evenementen, isLoading, upsertEvent, deleteEvent };
}
