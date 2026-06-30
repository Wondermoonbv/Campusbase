import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DeliverableStatus = "te leveren" | "geleverd" | "n.v.t.";

export interface DeliverableType {
  slug: string;
  label: string;
  volgorde: number;
}

export interface ContractDeliverable {
  id: string;
  contract_id: string;
  type: string;
  omschrijving: string | null;
  aantal: number | null;
  kanaal: string | null;
  status: DeliverableStatus;
  deadline: string | null;
  geleverd_op: string | null;
  geschatte_waarde: number | null;
  waarde_score: number | null;
  evaluatie: string | null;
  notities: string | null;
}

export function useDeliverableTypes() {
  return useQuery({
    queryKey: ["deliverable_types"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliverable_types")
        .select("slug, label, volgorde")
        .eq("actief", true)
        .order("volgorde", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DeliverableType[];
    },
  });
}

export function useContractDeliverables(contractId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["contract_deliverables", contractId],
    enabled: !!contractId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_deliverables")
        .select("*, deliverable_types(volgorde, label)")
        .eq("contract_id", contractId!);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      rows.sort((a, b) => {
        const va = a.deliverable_types?.volgorde ?? 999;
        const vb = b.deliverable_types?.volgorde ?? 999;
        if (va !== vb) return va - vb;
        const da = a.deadline ?? "9999-12-31";
        const db = b.deadline ?? "9999-12-31";
        return da.localeCompare(db);
      });
      return rows.map(({ deliverable_types, ...r }) => ({
        ...r,
        geschatte_waarde: r.geschatte_waarde != null ? Number(r.geschatte_waarde) : null,
      })) as ContractDeliverable[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<ContractDeliverable> & { contract_id: string; type: string }) => {
      const { id, ...rest } = input as any;
      if (id) {
        const { error } = await supabase.from("contract_deliverables").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contract_deliverables").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contract_deliverables", contractId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contract_deliverables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contract_deliverables", contractId] }),
  });

  return { ...query, upsert, remove };
}