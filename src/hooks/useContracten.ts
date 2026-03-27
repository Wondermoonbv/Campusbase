import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase-helpers";
import type { Contract } from "@/types/crm";

export function useContracten() {
  const qc = useQueryClient();

  const { data: contracten = [], isLoading } = useQuery({
    queryKey: ["contracten"],
    queryFn: async () => {
      const { data, error } = await db("contracten").select("*").order("end_date", { ascending: true });
      if (error) throw error;
      // Fetch linked events for each contract
      const { data: links } = await db("contract_evenementen").select("*");
      const linkMap = new Map<string, string[]>();
      (links ?? []).forEach((l: any) => {
        const arr = linkMap.get(l.contract_id) ?? [];
        arr.push(l.event_id);
        linkMap.set(l.contract_id, arr);
      });
      return (data as any[]).map((c) => ({
        ...c,
        value: c.value != null ? Number(c.value) : null,
        linked_event_ids: linkMap.get(c.id) ?? [],
      })) as Contract[];
    },
  });

  const upsertContract = useMutation({
    mutationFn: async (contract: Partial<Contract> & { school_id: string }) => {
      const { school, linked_event_ids, ...rest } = contract as any;
      const payload: any = { ...rest };
      if (payload.value === "" || payload.value === undefined) payload.value = null;
      if (payload.renewal_date === "") payload.renewal_date = null;

      let savedId: string;
      if (contract.id) {
        const { id, ...updates } = payload;
        const { data, error } = await db("contracten").update(updates).eq("id", id).select().single();
        if (error) throw error;
        savedId = (data as any).id;
      } else {
        const { id, ...insert } = payload;
        const { data, error } = await db("contracten").insert(insert).select().single();
        if (error) throw error;
        savedId = (data as any).id;
      }

      // Update linked events
      if (linked_event_ids !== undefined) {
        await db("contract_evenementen").delete().eq("contract_id", savedId);
        if (linked_event_ids.length > 0) {
          await db("contract_evenementen").insert(
            linked_event_ids.map((eid: string) => ({ contract_id: savedId, event_id: eid }))
          );
        }
      }

      return { ...payload, id: savedId, linked_event_ids: linked_event_ids ?? [] } as Contract;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracten"] }),
  });

  const deleteContract = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db("contracten").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracten"] }),
  });

  return { contracten, isLoading, upsertContract, deleteContract };
}
