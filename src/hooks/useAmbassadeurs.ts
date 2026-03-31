import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Ambassadeur {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

export interface EventInschrijving {
  id: string;
  evenement_id: string;
  ambassadeur_id: string;
  status: string;
  ingeschreven_op: string;
  bevestigd_op: string | null;
  notities: string;
}

export function useAmbassadeurs() {
  const qc = useQueryClient();

  const { data: ambassadeurs = [], isLoading } = useQuery({
    queryKey: ["ambassadeurs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassadeurs")
        .select("*")
        .order("full_name");
      if (error) { console.error(error); return []; }
      return data as Ambassadeur[];
    },
  });

  const upsertAmbassadeur = useMutation({
    mutationFn: async (amb: Partial<Ambassadeur> & { full_name: string; email: string }) => {
      if (amb.id) {
        const { id, created_at, ...updates } = amb as any;
        const { data, error } = await supabase
          .from("ambassadeurs")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as Ambassadeur;
      } else {
        const { id, created_at, ...insert } = amb as any;
        const { data, error } = await supabase
          .from("ambassadeurs")
          .insert(insert)
          .select()
          .single();
        if (error) throw error;
        return data as Ambassadeur;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambassadeurs"] }),
  });

  const deleteAmbassadeur = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ambassadeurs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambassadeurs"] }),
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
        .select("*")
        .eq("evenement_id", eventId!);
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event_inschrijvingen", eventId] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "bevestigd") updates.bevestigd_op = new Date().toISOString();
      const { error } = await supabase
        .from("event_inschrijvingen")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event_inschrijvingen", eventId] }),
  });

  const deleteInschrijving = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_inschrijvingen").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event_inschrijvingen", eventId] }),
  });

  return { inschrijvingen, isLoading, addInschrijving, updateStatus, deleteInschrijving };
}

export function useAllInschrijvingen() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["event_inschrijvingen_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_inschrijvingen")
        .select("*");
      if (error) { console.error(error); return []; }
      return data as EventInschrijving[];
    },
  });
  return { inschrijvingen: data, isLoading };
}
