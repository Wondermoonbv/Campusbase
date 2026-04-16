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
    teardown_time: mapTime(row.teardown_time),
    setup_date: row.setup_date ?? "",
    budget: row.budget != null ? Number(row.budget) : null,
    team_members: row.team_members ?? [],
    organisator_id: row.organisator_id ?? null,
    region: row.region ?? null,
    event_language: row.event_language ?? null,
    target_level: row.target_level ?? null,
    registration_type: row.registration_type ?? null,
    follow_up_status: row.follow_up_status ?? undefined,
    booth_size: row.booth_size ?? null,
    requires_booth_builder: row.requires_booth_builder ?? false,
    max_ambassadeurs: row.max_ambassadeurs ?? null,
  };
}

export function useEvenementen() {
  const qc = useQueryClient();

  const { data: evenementen = [], isLoading } = useQuery({
    queryKey: ["evenementen"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evenementen")
        .select("id, name, type, date, start_time, end_time, setup_date, setup_time, teardown_time, location, organisator_id, team_members, elia_contact, budget, status, description, stand_type, booth_size, notes, requires_booth_builder, max_ambassadeurs, region, event_language, target_level, registration_type, follow_up_status")
        .order("date", { ascending: true });
      if (error) { console.error("Error fetching evenementen:", error); return []; }
      return (data as any[]).map(mapEvent);
    },
    staleTime: 30_000,
  });

  const upsertEvent = useMutation({
    mutationFn: async (event: Partial<Event> & { name: string }) => {
      const { school, target_program_ids, contactpersoon, ...rest } = event as any;
      const payload: any = { ...rest };
      if (payload.budget === "" || payload.budget === undefined) payload.budget = null;
      if (payload.organisator_id === "" || payload.organisator_id === "none") payload.organisator_id = null;
      if (payload.start_time === "") payload.start_time = null;
      if (payload.end_time === "") payload.end_time = null;
      if (payload.setup_date === "") payload.setup_date = null;
      if (payload.setup_time === "") payload.setup_time = null;
      if (payload.teardown_time === "") payload.teardown_time = null;
      if (payload.region === "" || payload.region === "none") payload.region = null;
      if (payload.event_language === "" || payload.event_language === "none") payload.event_language = null;
      if (payload.target_level === "" || payload.target_level === "none") payload.target_level = null;
      if (payload.registration_type === "" || payload.registration_type === "none") payload.registration_type = null;

      if (event.id) {
        const { id, created_at, ...updates } = payload;
        const { data, error } = await supabase.from("evenementen").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return { data: mapEvent(data), action: "update" as const, updates };
      } else {
        const { id, created_at, ...insert } = payload;
        const { data, error } = await supabase.from("evenementen").insert(insert).select().single();
        if (error) throw error;
        const mapped = mapEvent(data);
        try {
          const user = (await supabase.auth.getUser()).data.user;
          await supabase.from("feedback_forms").insert({
            evenement_id: mapped.id,
            title: `Feedback — ${mapped.name}`,
            is_active: false,
            created_by: user?.id ?? null,
          });
        } catch { /* non-critical */ }
        return { data: mapped, action: "create" as const, updates: insert };
      }
    },
    onSuccess: ({ data, action, updates }) => {
      qc.invalidateQueries({ queryKey: ["evenementen"] });
      if (action === "create") qc.invalidateQueries({ queryKey: ["feedback_forms"] });
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
