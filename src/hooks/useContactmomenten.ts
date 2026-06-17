import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ContactmomentType = "mail" | "telefoon" | "meeting" | "notitie" | "andere";
export type ContactmomentBron = "manueel" | "systeem";

export interface Contactmoment {
  id: string;
  organisatie_id: string;
  contact_id: string | null;
  type: ContactmomentType;
  onderwerp: string;
  notities: string | null;
  occurred_at: string;
  created_by: string | null;
  bron: ContactmomentBron;
  created_at: string;
}

export interface NewContactmoment {
  organisatie_id: string;
  contact_id?: string | null;
  type: ContactmomentType;
  onderwerp: string;
  notities?: string | null;
  occurred_at: string;
}

export function useContactmomenten(organisatieIds: string[], opts?: { contactId?: string }) {
  const qc = useQueryClient();
  const ids = [...organisatieIds].sort();
  const contactId = opts?.contactId;
  const key = contactId
    ? ["contactmomenten", "contact", contactId]
    : ["contactmomenten", ids];

  const { data = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!contactId || ids.length > 0,
    queryFn: async () => {
      let query = supabase
        .from("contactmomenten")
        .select("id, organisatie_id, contact_id, type, onderwerp, notities, occurred_at, created_by, bron, created_at");
      if (contactId) {
        query = query.eq("contact_id", contactId);
      } else {
        query = query.in("organisatie_id", ids);
      }
      const { data, error } = await query.order("occurred_at", { ascending: false }).limit(500);
      if (error) { console.error("Error fetching contactmomenten:", error); return []; }
      return data as unknown as Contactmoment[];
    },
    staleTime: 30 * 1000,
  });

  const create = useMutation({
    mutationFn: async (payload: NewContactmoment & { created_by?: string | null }) => {
      const insert = { ...payload, bron: "manueel" as const };
      const { data, error } = await supabase
        .from("contactmomenten")
        .insert(insert)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Contactmoment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contactmomenten"] });
    },
  });

  return { contactmomenten: data, isLoading, create };
}
