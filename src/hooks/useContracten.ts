import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase-helpers";
import type { Contract } from "@/types/crm";
import { writeAuditLog } from "@/lib/audit";

export function useContracten() {
  const qc = useQueryClient();

  const { data: contracten = [], isLoading } = useQuery({
    queryKey: ["contracten"],
    queryFn: async () => {
      const { data, error } = await db("contracten").select("*").order("end_date", { ascending: true });
      if (error) { console.error("Error fetching contracten:", error); return []; }
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
      let action: "create" | "update";
      if (contract.id) {
        const { id, ...updates } = payload;
        const { data, error } = await db("contracten").update(updates).eq("id", id).select().single();
        if (error) throw error;
        savedId = (data as any).id;
        action = "update";
      } else {
        const { id, ...insert } = payload;
        const { data, error } = await db("contracten").insert(insert).select().single();
        if (error) throw error;
        savedId = (data as any).id;
        action = "create";
      }

      if (linked_event_ids !== undefined) {
        await db("contract_evenementen").delete().eq("contract_id", savedId);
        if (linked_event_ids.length > 0) {
          await db("contract_evenementen").insert(
            linked_event_ids.map((eid: string) => ({ contract_id: savedId, event_id: eid }))
          );
        }
      }

      const result = { ...payload, id: savedId, linked_event_ids: linked_event_ids ?? [] } as Contract;
      return { data: result, action };
    },
    onSuccess: ({ data, action }) => {
      qc.invalidateQueries({ queryKey: ["contracten"] });
      writeAuditLog({ action, entity_type: "contract", entity_id: data.id, entity_name: `Contract ${data.contract_type}`, changes: {} });
    },
  });

  const deleteContract = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await db("contracten").delete().eq("id", id);
      if (error) throw error;
      return { id, name };
    },
    onSuccess: ({ id, name }) => {
      qc.invalidateQueries({ queryKey: ["contracten"] });
      writeAuditLog({ action: "delete", entity_type: "contract", entity_id: id, entity_name: name });
    },
  });

  return { contracten, isLoading, upsertContract, deleteContract };
}
