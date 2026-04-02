import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Event } from "@/types/crm";
import { writeAuditLog } from "@/lib/audit";

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
      const { data, error } = await supabase
        .from("evenementen")
        .select("id, name, type, date, start_time, end_time, setup_date, setup_time, location, school_id, responsible, team_members, elia_contact, budget, status, description, stand_type, stand_size, notes, opbouw_tijd, afbraak_tijd, stand_grootte, contactpersoon_stand, stand_notities, standenbouwer_nodig")
        .order("date", { ascending: true });
      if (error) { console.error("Error fetching evenementen:", error); return []; }
      return (data as any[]).map(mapEvent);
    },
  });

  const upsertEvent = useMutation({
    mutationFn: async (event: Partial<Event> & { name: string }) => {
      const { school, target_program_ids, ...rest } = event as any;
      const payload: any = { ...rest };
      if (payload.budget === "" || payload.budget === undefined) payload.budget = null;
      if (payload.school_id === "" || payload.school_id === "none") payload.school_id = null;
      if (payload.start_time === "") payload.start_time = null;
      if (payload.end_time === "") payload.end_time = null;
      if (payload.setup_date === "") payload.setup_date = null;
      if (payload.setup_time === "") payload.setup_time = null;

      if (event.id) {
        const { id, created_at, ...updates } = payload;
        const { data, error } = await supabase.from("evenementen").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return { data: mapEvent(data), action: "update" as const, updates };
      } else {
        const { id, created_at, ...insert } = payload;
        const { data, error } = await supabase.from("evenementen").insert(insert).select().single();
        if (error) throw error;
        return { data: mapEvent(data), action: "create" as const, updates: insert };
      }
    },
    onSuccess: ({ data, action, updates }) => {
      qc.invalidateQueries({ queryKey: ["evenementen"] });
      writeAuditLog({ action, entity_type: "evenement", entity_id: data.id, entity_name: data.name, changes: updates });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("evenementen").delete().eq("id", id);
      if (error) throw error;
      return { id, name };
    },
    onSuccess: ({ id, name }) => {
      qc.invalidateQueries({ queryKey: ["evenementen"] });
      writeAuditLog({ action: "delete", entity_type: "evenement", entity_id: id, entity_name: name });
    },
  });

  return { evenementen, isLoading, upsertEvent, deleteEvent };
}
