import { useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/types/crm";
import { writeAuditLog } from "@/lib/audit";

export function useTaken() {
  const qc = useQueryClient();
  const lastSyncRef = useRef<Date>(new Date());

  const { data: taken = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["taken"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taken")
        .select("id, title, description, organisatie_id, event_id, assigned_to, due_date, priority, status, created_at")
        .order("due_date", { ascending: true });
      if (error) { console.error("Error fetching taken:", error); return []; }
      lastSyncRef.current = new Date();
      return (data as any[]).map((t) => ({
        ...t,
        organisatie_id: t.organisatie_id ?? null,
        event_id: t.event_id ?? null,
        description: t.description ?? "",
      })) as Task[];
    },
    staleTime: 30_000,
  });

  // Realtime subscription — invalidate query on any change
  useEffect(() => {
    const channel = supabase
      .channel("taken-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "taken" },
        () => {
          qc.invalidateQueries({ queryKey: ["taken"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const upsertTask = useMutation({
    mutationFn: async (task: Partial<Task> & { title: string }) => {
      const payload: any = { ...task };
      if (payload.organisatie_id === "" || payload.organisatie_id === "none") payload.organisatie_id = null;
      if (payload.event_id === "" || payload.event_id === "none") payload.event_id = null;
      if (payload.due_date === "") payload.due_date = null;

      if (task.id) {
        const { id, created_at, ...updates } = payload;
        const { data, error } = await supabase.from("taken").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return { data: data as Task, action: "update" as const, updates };
      } else {
        const { id, created_at, ...insert } = payload;
        const { data, error } = await supabase.from("taken").insert(insert).select().single();
        if (error) throw error;
        return { data: data as Task, action: "create" as const, updates: insert };
      }
    },
    onSuccess: ({ data, action, updates }) => {
      qc.invalidateQueries({ queryKey: ["taken"] });
      writeAuditLog({ action, entity_type: "taak", entity_id: data.id, entity_name: data.title, changes: updates });
    },
  });

  // Optimistic status toggle
  const toggleTaskStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "afgerond" ? "open" : "afgerond";
      const { data, error } = await supabase
        .from("taken")
        .update({ status: newStatus })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onMutate: async ({ id, currentStatus }) => {
      await qc.cancelQueries({ queryKey: ["taken"] });
      const previous = qc.getQueryData<Task[]>(["taken"]);
      const newStatus = currentStatus === "afgerond" ? "open" : "afgerond";
      qc.setQueryData<Task[]>(["taken"], (old) =>
        old?.map((t) => (t.id === id ? { ...t, status: newStatus } : t)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["taken"], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["taken"] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("taken").delete().eq("id", id);
      if (error) throw error;
      return { id, title };
    },
    onSuccess: ({ id, title }) => {
      qc.invalidateQueries({ queryKey: ["taken"] });
      writeAuditLog({ action: "delete", entity_type: "taak", entity_id: id, entity_name: title });
    },
  });

  const lastSynced = dataUpdatedAt ? new Date(dataUpdatedAt) : lastSyncRef.current;

  return { taken, isLoading, upsertTask, deleteTask, toggleTaskStatus, lastSynced };
}
