import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Event, Contact } from "@/types/crm";
import { writeAuditLog } from "@/lib/audit";

function mapTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.length > 5 ? t.slice(0, 5) : t;
}

function mapEvent(row: any): Event & { contactpersoon?: Contact | null } {
  const { contactpersoon, ...rest } = row;
  return {
    ...rest,
    start_time: mapTime(rest.start_time),
    end_time: mapTime(rest.end_time),
    setup_time: mapTime(rest.setup_time),
    setup_date: rest.setup_date ?? "",
    budget: rest.budget != null ? Number(rest.budget) : null,
    team_members: rest.team_members ?? [],
    organisator_id: rest.organisator_id ?? null,
    contactpersoon_id: rest.contactpersoon_id ?? null,
    contactpersoon: contactpersoon ?? null,
  };
}

export function useEvenementen() {
  const qc = useQueryClient();

  const { data: evenementen = [], isLoading } = useQuery({
    queryKey: ["evenementen"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evenementen")
        .select("id, name, type, date, start_time, end_time, setup_date, setup_time, location, organisator_id, responsible, team_members, elia_contact, budget, status, description, stand_type, stand_size, notes, opbouw_tijd, afbraak_tijd, stand_grootte, contactpersoon_stand, stand_notities, standenbouwer_nodig, max_ambassadeurs, regio, taal, doelgroep_niveau, contactpersoon_id, registratie_type, follow_up_status, contactpersoon:contacten(id, name, email, phone, role, department)")
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
      if (payload.regio === "" || payload.regio === "none") payload.regio = null;
      if (payload.taal === "" || payload.taal === "none") payload.taal = null;
      if (payload.doelgroep_niveau === "" || payload.doelgroep_niveau === "none") payload.doelgroep_niveau = null;
      if (payload.registratie_type === "" || payload.registratie_type === "none") payload.registratie_type = null;
      if (payload.contactpersoon_id === "" || payload.contactpersoon_id === "none") payload.contactpersoon_id = null;

      if (event.id) {
        const { id, created_at, ...updates } = payload;
        const { data, error } = await supabase.from("evenementen").update(updates).eq("id", id).select("*, contactpersoon:contacten(id, name, email, phone, role, department)").single();
        if (error) throw error;
        return { data: mapEvent(data), action: "update" as const, updates };
      } else {
        const { id, created_at, ...insert } = payload;
        const { data, error } = await supabase.from("evenementen").insert(insert).select("*, contactpersoon:contacten(id, name, email, phone, role, department)").single();
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
