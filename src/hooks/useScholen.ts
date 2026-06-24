import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { School, Contact } from "@/types/crm";
import { writeAuditLog } from "@/lib/audit";

export function useScholen() {
  const qc = useQueryClient();

  const { data: scholen = [], isLoading } = useQuery({
    queryKey: ["scholen"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organisaties")
        .select("id, name, type, school_type, province, city, website, language, notes, status, created_at, parent_id, is_nationaal, verbonden_instelling_id")
        .range(0, 9999)
        .order("name", { ascending: true });
      if (error) { console.error("Error fetching organisaties:", error); return []; }
      return data as unknown as School[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const upsertSchool = useMutation({
    mutationFn: async (school: Partial<School> & { name: string }) => {
      const { contacts, ...rest } = school as any;
      if (school.id) {
        const { id, created_at, ...updates } = rest;
        const { data, error } = await supabase.from("organisaties").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return { data: data as unknown as School, action: "update" as const, updates };
      } else {
        const { id, created_at, ...insert } = rest;
        const { data, error } = await supabase.from("organisaties").insert(insert).select().single();
        if (error) throw error;
        return { data: data as unknown as School, action: "create" as const, updates: insert };
      }
    },
    onSuccess: ({ data, action, updates }) => {
      qc.invalidateQueries({ queryKey: ["scholen"] });
      qc.invalidateQueries({ queryKey: ["organisaties-paged"] });
      qc.invalidateQueries({ queryKey: ["organisatie-type-counts"] });
      writeAuditLog({ action, entity_type: "school", entity_id: data.id, entity_name: data.name, changes: updates });
    },
  });

  const deleteSchool = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("organisaties").delete().eq("id", id);
      if (error) throw error;
      return { id, name };
    },
    onSuccess: ({ id, name }) => {
      qc.invalidateQueries({ queryKey: ["scholen"] });
      qc.invalidateQueries({ queryKey: ["organisaties-paged"] });
      qc.invalidateQueries({ queryKey: ["organisatie-type-counts"] });
      writeAuditLog({ action: "delete", entity_type: "school", entity_id: id, entity_name: name });
    },
  });

  return { scholen, isLoading, upsertSchool, deleteSchool };
}

// Server-side type counts for tab badges (independent of pagination/filters)
export function useOrganisatieTypeCounts() {
  return useQuery({
    queryKey: ["organisatie-type-counts"],
    queryFn: async () => {
      const types = ["school", "studentenvereniging", "werkgeversorganisatie", "overheid", "andere"] as const;
      const total = await supabase.from("organisaties").select("id", { count: "exact", head: true });
      const counts: Record<string, number> = { all: total.count ?? 0 };
      await Promise.all(types.map(async (t) => {
        const r = await supabase.from("organisaties").select("id", { count: "exact", head: true }).eq("type", t);
        counts[t] = r.count ?? 0;
      }));
      return counts;
    },
    staleTime: 60 * 1000,
  });
}

export interface PagedOrgParams {
  page: number;
  pageSize: number;
  search: string;
  orgType: string;
  province: string;
  language: string;
  status: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  hierarchical: boolean;
}

export interface PagedOrgRow extends School {
  parent?: { id: string; name: string } | null;
  verbonden_instelling?: { id: string; name: string } | null;
}

export function useOrganisatiesPaged(p: PagedOrgParams) {
  return useQuery({
    queryKey: ["organisaties-paged", p],
    queryFn: async () => {
      const select =
        "id, name, type, school_type, province, city, website, language, notes, status, created_at, parent_id, is_nationaal, verbonden_instelling_id, parent:parent_id(id,name), verbonden_instelling:verbonden_instelling_id(id,name)";
      let q: any = supabase.from("organisaties").select(select, { count: "exact" });
      const term = p.search.trim();
      if (term) {
        const escaped = term.replace(/[%,]/g, " ");
        q = q.or(`name.ilike.%${escaped}%,city.ilike.%${escaped}%`);
      }
      if (p.orgType !== "all") q = q.eq("type", p.orgType);
      if (p.province !== "all") q = q.eq("province", p.province);
      if (p.language !== "all") q = q.eq("language", p.language);
      if (p.status !== "all") q = q.eq("status", p.status);
      if (p.hierarchical) q = q.is("parent_id", null);
      q = q.order(p.sortKey, { ascending: p.sortDir === "asc" });
      const from = (p.page - 1) * p.pageSize;
      const to = from + p.pageSize - 1;
      q = q.range(from, to);
      const { data, error, count } = await q;
      if (error) { console.error("Error fetching paged organisaties:", error); throw error; }
      const rows = (data ?? []) as PagedOrgRow[];
      const campusesByParent: Record<string, PagedOrgRow[]> = {};
      if (p.hierarchical && rows.length > 0) {
        const parentIds = rows.map((r) => r.id);
        const { data: campData } = await supabase
          .from("organisaties")
          .select(select)
          .in("parent_id", parentIds)
          .order("name", { ascending: true })
          .range(0, 9999);
        ((campData ?? []) as PagedOrgRow[]).forEach((c) => {
          if (!c.parent_id) return;
          (campusesByParent[c.parent_id] ??= []).push(c);
        });
      }
      return { rows, campusesByParent, totalCount: count ?? 0 };
    },
    staleTime: 30 * 1000,
  });
}

export function useContacten(schoolId?: string) {
  const qc = useQueryClient();

  const { data: contacten = [], isLoading } = useQuery({
    queryKey: ["contacten", schoolId],
    queryFn: async () => {
      let query = supabase.from("contacten").select("id, name, email, phone, role, department, organisatie_id, linkedin_url, notes");
      if (schoolId) query = query.eq("organisatie_id", schoolId);
      const { data, error } = await query.order("name", { ascending: true });
      if (error) { console.error("Error fetching contacten:", error); return []; }
      return data as unknown as Contact[];
    },
  });

  const upsertContact = useMutation({
    mutationFn: async (contact: Partial<Contact> & { name: string }) => {
      if (contact.id) {
        const { id, ...updates } = contact;
        const { data, error } = await supabase.from("contacten").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return { data: data as unknown as Contact, action: "update" as const, updates };
      } else {
        const { id, ...insert } = contact;
        const { data, error } = await supabase.from("contacten").insert(insert).select().single();
        if (error) throw error;
        return { data: data as unknown as Contact, action: "create" as const, updates: insert };
      }
    },
    onSuccess: ({ data, action, updates }) => {
      qc.invalidateQueries({ queryKey: ["contacten"] });
      writeAuditLog({ action, entity_type: "contact", entity_id: data.id, entity_name: data.name, changes: updates });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("contacten").delete().eq("id", id);
      if (error) throw error;
      return { id, name };
    },
    onSuccess: ({ id, name }) => {
      qc.invalidateQueries({ queryKey: ["contacten"] });
      writeAuditLog({ action: "delete", entity_type: "contact", entity_id: id, entity_name: name });
    },
  });

  return { contacten, isLoading, upsertContact, deleteContact };
}
