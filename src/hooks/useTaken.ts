import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase-helpers";
import type { Task } from "@/types/crm";

export function useTaken() {
  const qc = useQueryClient();

  const { data: taken = [], isLoading } = useQuery({
    queryKey: ["taken"],
    queryFn: async () => {
      const { data, error } = await db("taken").select("*").order("due_date", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((t) => ({
        ...t,
        school_id: t.school_id ?? null,
        event_id: t.event_id ?? null,
        description: t.description ?? "",
      })) as Task[];
    },
  });

  const upsertTask = useMutation({
    mutationFn: async (task: Partial<Task> & { title: string }) => {
      const payload: any = { ...task };
      if (payload.school_id === "" || payload.school_id === "none") payload.school_id = null;
      if (payload.event_id === "" || payload.event_id === "none") payload.event_id = null;
      if (payload.due_date === "") payload.due_date = null;

      if (task.id) {
        const { id, created_at, ...updates } = payload;
        const { data, error } = await db("taken").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return data as Task;
      } else {
        const { id, created_at, ...insert } = payload;
        const { data, error } = await db("taken").insert(insert).select().single();
        if (error) throw error;
        return data as Task;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taken"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db("taken").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taken"] }),
  });

  return { taken, isLoading, upsertTask, deleteTask };
}
