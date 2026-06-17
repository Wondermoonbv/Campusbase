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
  collega_ids: string[];
  contact_ids: string[];
}

export interface NewContactmoment {
  organisatie_id: string;
  contact_id?: string | null;
  type: ContactmomentType;
  onderwerp: string;
  notities?: string | null;
  occurred_at: string;
}

const SELECT_COLS =
  "id, organisatie_id, contact_id, type, onderwerp, notities, occurred_at, created_by, bron, created_at, contactmoment_collegas(profile_id), contactmoment_contacten(contact_id)";

function normalize(row: any): Contactmoment {
  return {
    ...row,
    collega_ids: (row.contactmoment_collegas ?? []).map((r: any) => r.profile_id),
    contact_ids: (row.contactmoment_contacten ?? []).map((r: any) => r.contact_id),
  } as Contactmoment;
}

async function syncJunction(
  table: "contactmoment_collegas" | "contactmoment_contacten",
  fk: "profile_id" | "contact_id",
  momentId: string,
  current: string[],
  next: string[],
) {
  const toAdd = next.filter((x) => !current.includes(x));
  const toRemove = current.filter((x) => !next.includes(x));
  if (toAdd.length > 0) {
    const rows = toAdd.map((v) => ({ contactmoment_id: momentId, [fk]: v }));
    const { error } = await supabase.from(table).insert(rows as any);
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await (supabase.from(table) as any)
      .delete()
      .eq("contactmoment_id", momentId)
      .in(fk, toRemove);
    if (error) throw error;
  }
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
      if (contactId) {
        // Find moment IDs via junction table, then union with legacy contact_id field
        const { data: junctionRows, error: jErr } = await supabase
          .from("contactmoment_contacten")
          .select("contactmoment_id")
          .eq("contact_id", contactId);
        if (jErr) { console.error(jErr); return []; }
        const junctionIds = (junctionRows ?? []).map((r: any) => r.contactmoment_id);
        const orParts: string[] = [`contact_id.eq.${contactId}`];
        if (junctionIds.length > 0) orParts.push(`id.in.(${junctionIds.join(",")})`);
        const { data, error } = await supabase
          .from("contactmomenten")
          .select(SELECT_COLS)
          .or(orParts.join(","))
          .order("occurred_at", { ascending: false })
          .limit(500);
        if (error) { console.error("Error fetching contactmomenten:", error); return []; }
        return (data ?? []).map(normalize);
      }
      const { data, error } = await supabase
        .from("contactmomenten")
        .select(SELECT_COLS)
        .in("organisatie_id", ids)
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) { console.error("Error fetching contactmomenten:", error); return []; }
      return (data ?? []).map(normalize);
    },
    staleTime: 30 * 1000,
  });

  const save = useMutation({
    mutationFn: async (payload: NewContactmoment & {
      id?: string;
      created_by?: string | null;
      collega_ids?: string[];
      contact_ids?: string[];
      _currentCollegaIds?: string[];
      _currentContactIds?: string[];
    }) => {
      const { id, collega_ids = [], contact_ids = [], _currentCollegaIds = [], _currentContactIds = [], ...rest } = payload;
      let momentId: string;
      let currentCollegas = _currentCollegaIds;
      let currentContacts = _currentContactIds;
      if (id) {
        const { error } = await supabase
          .from("contactmomenten")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
        momentId = id;
      } else {
        const insert = { ...rest, bron: "manueel" as const };
        const { data, error } = await supabase
          .from("contactmomenten")
          .insert(insert)
          .select("id")
          .single();
        if (error) throw error;
        momentId = (data as any).id;
        currentCollegas = [];
        currentContacts = [];
      }
      await syncJunction("contactmoment_collegas", "profile_id", momentId, currentCollegas, collega_ids);
      await syncJunction("contactmoment_contacten", "contact_id", momentId, currentContacts, contact_ids);
      return momentId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contactmomenten"] });
    },
  });

  return { contactmomenten: data, isLoading, save, create: save };
}
