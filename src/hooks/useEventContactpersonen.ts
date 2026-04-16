import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContactpersoonRol } from "@/types/crm";

export interface EventContactpersoonRow {
  id: string;
  event_id: string;
  contact_id: string;
  rol: ContactpersoonRol;
  notities: string;
  created_at: string;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    department: string | null;
    organisatie_id: string | null;
  };
}

export function useEventContactpersonen(eventId?: string) {
  const qc = useQueryClient();

  const { data: contactpersonen = [], isLoading } = useQuery({
    queryKey: ["event_contactpersonen", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_contactpersonen")
        .select("*, contact:contacten(id, name, email, phone, role, department, organisatie_id)")
        .eq("event_id", eventId!)
        .order("created_at", { ascending: true });
      if (error) { console.error("Error fetching event_contactpersonen:", error); return []; }
      return (data ?? []) as unknown as EventContactpersoonRow[];
    },
    staleTime: 30_000,
  });

  const addContactpersoon = useMutation({
    mutationFn: async (input: { event_id: string; contact_id: string; rol: ContactpersoonRol; notities?: string }) => {
      const { data, error } = await supabase
        .from("event_contactpersonen")
        .insert({ event_id: input.event_id, contact_id: input.contact_id, rol: input.rol, notities: input.notities || "" })
        .select("*, contact:contacten(id, name, email, phone, role, department, organisatie_id)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event_contactpersonen", eventId] }); },
  });

  const removeContactpersoon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_contactpersonen").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event_contactpersonen", eventId] }); },
  });

  const syncContactpersonen = useMutation({
    mutationFn: async ({ eventId: eid, items }: { eventId: string; items: { contact_id: string; rol: ContactpersoonRol; notities?: string }[] }) => {
      // Delete all existing, then insert new ones
      await supabase.from("event_contactpersonen").delete().eq("event_id", eid);
      if (items.length > 0) {
        const rows = items.map((i) => ({ event_id: eid, contact_id: i.contact_id, rol: i.rol, notities: i.notities || "" }));
        const { error } = await supabase.from("event_contactpersonen").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["event_contactpersonen", vars.eventId] }); },
  });

  return { contactpersonen, isLoading, addContactpersoon, removeContactpersoon, syncContactpersonen };
}
