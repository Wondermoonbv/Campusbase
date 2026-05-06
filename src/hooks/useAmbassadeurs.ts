import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/lib/audit";

export interface Ambassadeur {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  access_token: string;
}

export interface EventInschrijving {
  id: string;
  evenement_id: string;
  ambassadeur_id: string;
  status: string;
  ingeschreven_op: string;
  bevestigd_op: string | null;
  notities: string;
  confirmation_snapshot?: {
    date: string;
    start_time: string | null;
    end_time: string | null;
    location: string;
  } | null;
  reminder_sent_at?: string | null;
}

export function useAmbassadeurs() {
  const qc = useQueryClient();

  const { data: ambassadeurs = [], isLoading } = useQuery({
    queryKey: ["ambassadeurs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassadeurs")
        .select("id, full_name, email, phone, department, notes, is_active, created_at, access_token")
        .order("full_name", { ascending: true });
      if (error) { console.error(error); return []; }
      return data as Ambassadeur[];
    },
    staleTime: 30_000,
  });

  const upsertAmbassadeur = useMutation({
    mutationFn: async (amb: Partial<Ambassadeur> & { full_name: string; email: string }) => {
      if (amb.id) {
        const { id, created_at, ...updates } = amb as any;
        const { data, error } = await supabase.from("ambassadeurs").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return { data: data as Ambassadeur, action: "update" as const, updates };
      } else {
        const { id, created_at, ...insert } = amb as any;
        const { data, error } = await supabase.from("ambassadeurs").insert(insert).select().single();
        if (error) throw error;
        return { data: data as Ambassadeur, action: "create" as const, updates: insert };
      }
    },
    onSuccess: ({ data, action, updates }) => {
      qc.invalidateQueries({ queryKey: ["ambassadeurs"] });
      writeAuditLog({ action, entity_type: "ambassadeur", entity_id: data.id, entity_name: data.full_name, changes: updates });
    },
  });

  const deleteAmbassadeur = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("ambassadeurs").delete().eq("id", id);
      if (error) throw error;
      return { id, name };
    },
    onSuccess: ({ id, name }) => {
      qc.invalidateQueries({ queryKey: ["ambassadeurs"] });
      writeAuditLog({ action: "delete", entity_type: "ambassadeur", entity_id: id, entity_name: name });
    },
  });

  return { ambassadeurs, isLoading, upsertAmbassadeur, deleteAmbassadeur };
}

export function useEventInschrijvingen(eventId?: string) {
  const qc = useQueryClient();

  const { data: inschrijvingen = [], isLoading } = useQuery({
    queryKey: ["event_inschrijvingen", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_inschrijvingen")
        .select("id, evenement_id, ambassadeur_id, status, ingeschreven_op, bevestigd_op, notities")
        .eq("evenement_id", eventId!)
        .order("ingeschreven_op", { ascending: false });
      if (error) { console.error(error); return []; }
      return data as EventInschrijving[];
    },
  });

  const addInschrijving = useMutation({
    mutationFn: async (payload: { evenement_id: string; ambassadeur_id: string; status?: string }) => {
      const { data, error } = await supabase
        .from("event_inschrijvingen")
        .insert({ ...payload, status: payload.status ?? "ingeschreven" })
        .select()
        .single();
      if (error) throw error;
      return data as EventInschrijving;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["event_inschrijvingen", eventId] });
      writeAuditLog({ action: "create", entity_type: "inschrijving", entity_id: data.id, entity_name: `Inschrijving ${data.ambassadeur_id}`, changes: { evenement_id: data.evenement_id, ambassadeur_id: data.ambassadeur_id } });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "bevestigd") updates.bevestigd_op = new Date().toISOString();
      const { error } = await supabase.from("event_inschrijvingen").update(updates).eq("id", id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: ({ id, status }) => {
      qc.invalidateQueries({ queryKey: ["event_inschrijvingen", eventId] });
      writeAuditLog({ action: "update", entity_type: "inschrijving", entity_id: id, entity_name: `Inschrijving`, changes: { status } });
    },
  });

  const deleteInschrijving = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_inschrijvingen").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["event_inschrijvingen", eventId] });
      writeAuditLog({ action: "delete", entity_type: "inschrijving", entity_id: id, entity_name: "Inschrijving" });
    },
  });

  return { inschrijvingen, isLoading, addInschrijving, updateStatus, deleteInschrijving };
}

export function useAllInschrijvingen() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["event_inschrijvingen_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_inschrijvingen")
        .select("id, evenement_id, ambassadeur_id, status, ingeschreven_op, bevestigd_op, notities")
        .order("ingeschreven_op", { ascending: false });
      if (error) { console.error(error); return []; }
      return data as EventInschrijving[];
    },
  });
  return { inschrijvingen: data, isLoading };
}
