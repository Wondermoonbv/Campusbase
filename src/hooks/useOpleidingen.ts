import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Program, EventProgram } from "@/types/crm";
import { writeAuditLog } from "@/lib/audit";

export function useOpleidingen() {
  const qc = useQueryClient();

  const { data: opleidingen = [], isLoading } = useQuery({
    queryKey: ["opleidingen"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opleidingen")
        .select("id, name, school_id, faculty, field_of_study, study_level, student_count")
        .order("name", { ascending: true });
      if (error) { console.error("Error fetching opleidingen:", error); return []; }
      return data as Program[];
    },
  });

  const upsertOpleiding = useMutation({
    mutationFn: async (program: Partial<Program> & { name: string; school_id: string }) => {
      const { school, ...rest } = program as any;
      if (program.id) {
        const { id, ...updates } = rest;
        const { data, error } = await supabase.from("opleidingen").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return { data: data as Program, action: "update" as const, updates };
      } else {
        const { id, ...insert } = rest;
        const { data, error } = await supabase.from("opleidingen").insert(insert).select().single();
        if (error) throw error;
        return { data: data as Program, action: "create" as const, updates: insert };
      }
    },
    onSuccess: ({ data, action, updates }) => {
      qc.invalidateQueries({ queryKey: ["opleidingen"] });
      writeAuditLog({ action, entity_type: "opleiding", entity_id: data.id, entity_name: data.name, changes: updates });
    },
  });

  return { opleidingen, isLoading, upsertOpleiding };
}

export function useEventOpleidingen() {
  const qc = useQueryClient();

  const { data: eventOpleidingen = [] } = useQuery({
    queryKey: ["event_opleidingen"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_opleidingen")
        .select("event_id, opleiding_id")
        .order("event_id", { ascending: true });
      if (error) { console.error("Error fetching event_opleidingen:", error); return []; }
      return (data as any[]).map((d: any) => ({ event_id: d.event_id, program_id: d.opleiding_id })) as EventProgram[];
    },
  });

  const setEventPrograms = useMutation({
    mutationFn: async ({ eventId, programIds }: { eventId: string; programIds: string[] }) => {
      await supabase.from("event_opleidingen").delete().eq("event_id", eventId);
      if (programIds.length > 0) {
        const rows = programIds.map((pid) => ({ event_id: eventId, opleiding_id: pid }));
        const { error } = await supabase.from("event_opleidingen").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event_opleidingen"] }),
  });

  return { eventOpleidingen, setEventPrograms };
}
