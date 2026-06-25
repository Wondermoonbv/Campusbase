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
        .select("id, name, organisatie_id, faculty, field_of_study, study_level, student_count, is_stem")
        .order("name", { ascending: true });
      if (error) { console.error("Error fetching opleidingen:", error); return []; }
      return data as unknown as Program[];
    },
    staleTime: 30_000,
  });

  const upsertOpleiding = useMutation({
    mutationFn: async (program: Partial<Program> & { name: string; organisatie_id: string }) => {
      const { school, ...rest } = program as any;
      if (program.id) {
        const { id, ...updates } = rest;
        const { data, error } = await supabase.from("opleidingen").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return { data: data as unknown as Program, action: "update" as const, updates };
      } else {
        const { id, ...insert } = rest;
        const { data, error } = await supabase.from("opleidingen").insert(insert).select().single();
        if (error) throw error;
        return { data: data as unknown as Program, action: "create" as const, updates: insert };
      }
    },
    onSuccess: ({ data, action, updates }) => {
      qc.invalidateQueries({ queryKey: ["opleidingen"] });
      qc.invalidateQueries({ queryKey: ["opleidingen-paged"] });
      writeAuditLog({ action, entity_type: "opleiding", entity_id: data.id, entity_name: data.name, changes: updates });
    },
  });

  return { opleidingen, isLoading, upsertOpleiding };
}

export interface PagedOpleidingParams {
  page: number;
  pageSize: number;
  search: string;
  organisatieId: string; // "all" or uuid
  studyLevel: string; // "all" or value
  field: string; // "all" or value
  province?: string; // "all" or value
  stemOnly?: boolean;
  sortKey: string;
  sortDir: "asc" | "desc";
}

export interface PagedOpleidingRow extends Program {
  organisatie?: { id: string; name: string; parent_id: string | null; province?: string | null; parent?: { id: string; name: string } | null } | null;
}

export function useOpleidingenPaged(p: PagedOpleidingParams) {
  return useQuery({
    queryKey: ["opleidingen-paged", p],
    queryFn: async () => {
      const useInner = p.province && p.province !== "all";
      const orgRel = useInner ? "organisaties!inner" : "organisaties!organisatie_id";
      const select =
        `id, name, organisatie_id, faculty, field_of_study, study_level, student_count, is_stem, organisatie:${orgRel}(id, name, parent_id, province, parent:organisaties!parent_id(id, name))`;
      let q: any = supabase.from("opleidingen").select(select, { count: "exact" });
      const term = p.search.trim();
      if (term) {
        const escaped = term.replace(/[%,]/g, " ");
        q = q.or(`name.ilike.%${escaped}%,field_of_study.ilike.%${escaped}%`);
      }
      if (p.organisatieId && p.organisatieId !== "all") q = q.eq("organisatie_id", p.organisatieId);
      if (p.studyLevel && p.studyLevel !== "all") q = q.eq("study_level", p.studyLevel);
      if (p.field && p.field !== "all") q = q.eq("field_of_study", p.field);
      if (p.stemOnly) q = q.eq("is_stem", true);
      if (useInner) q = q.eq("organisaties.province", p.province);
      q = q.order(p.sortKey, { ascending: p.sortDir === "asc" });
      const from = (p.page - 1) * p.pageSize;
      const to = from + p.pageSize - 1;
      q = q.range(from, to);
      const { data, error, count } = await q;
      if (error) { console.error("Error fetching paged opleidingen:", error); throw error; }
      return { rows: (data ?? []) as unknown as PagedOpleidingRow[], totalCount: count ?? 0 };
    },
    staleTime: 30_000,
  });
}

// Distinct values for filter dropdowns
export function useOpleidingFilterOptions() {
  return useQuery({
    queryKey: ["opleiding-filter-options"],
    queryFn: async () => {
      const [levels, fields, hasFaculty, hasStudents] = await Promise.all([
        supabase.from("opleidingen").select("study_level").not("study_level", "is", null).neq("study_level", "").range(0, 9999),
        supabase.from("opleidingen").select("field_of_study").not("field_of_study", "is", null).neq("field_of_study", "").range(0, 9999),
        supabase.from("opleidingen").select("id", { count: "exact", head: true }).not("faculty", "is", null).neq("faculty", ""),
        supabase.from("opleidingen").select("id", { count: "exact", head: true }).not("student_count", "is", null),
      ]);
      const levelSet = new Set<string>();
      ((levels.data ?? []) as any[]).forEach((r) => r.study_level && levelSet.add(r.study_level));
      const fieldSet = new Set<string>();
      ((fields.data ?? []) as any[]).forEach((r) => r.field_of_study && fieldSet.add(r.field_of_study));
      return {
        studyLevels: Array.from(levelSet).sort((a, b) => a.localeCompare(b)),
        fields: Array.from(fieldSet).sort((a, b) => a.localeCompare(b)),
        anyFaculty: (hasFaculty.count ?? 0) > 0,
        anyStudentCount: (hasStudents.count ?? 0) > 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
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
