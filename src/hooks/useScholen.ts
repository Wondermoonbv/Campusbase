import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { School, Contact } from "@/types/crm";
import { writeAuditLog } from "@/lib/audit";

export function useScholen() {
  const qc = useQueryClient();

  const { data: scholen = [], isLoading } = useQuery({
    queryKey: ["scholen"],
    queryFn: async () => {
      const PAGE = 1000;
      const cols = "id, name, type, school_type, province, city, website, email, telefoon, language, notes, status, created_at, parent_id, is_nationaal, verbonden_instelling_id, heeft_stem, latitude, longitude";
      const all: School[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("organisaties")
          .select(cols)
          .order("name", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) { console.error("Error fetching organisaties:", error); break; }
        if (!data || data.length === 0) break;
        all.push(...(data as unknown as School[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
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
  niveau?: string;
  schoolType?: string;
  schoolbestuurNr?: string;
  scholengemeenschapNr?: string;
  stemOnly?: boolean;
  opleidingTerm?: string;
}

export interface PagedOrgRow extends School {
  parent?: { id: string; name: string } | null;
  verbonden_instelling?: { id: string; name: string } | null;
  childCount?: number;
}

export function useOrganisatiesPaged(p: PagedOrgParams) {
  return useQuery({
    queryKey: ["organisaties-paged", p],
    queryFn: async () => {
      const select =
        "id, name, type, school_type, province, city, zoektermen, website, language, notes, status, created_at, parent_id, is_nationaal, verbonden_instelling_id, onderwijsniveau, schoolbestuur, schoolbestuur_nr, scholengemeenschap, scholengemeenschap_nr, heeft_stem, parent:organisaties!parent_id(id,name), verbonden_instelling:organisaties!verbonden_instelling_id(id,name)";
      const opleidingTerm = (p.opleidingTerm ?? "").trim();
      let q: any = opleidingTerm
        ? (supabase.rpc as any)("organisaties_met_opleiding", { zoek: opleidingTerm }).select(select, { count: "exact" })
        : supabase.from("organisaties").select(select, { count: "exact" });
      const term = p.search.trim();
      if (term) {
        const escaped = term.replace(/[%,]/g, " ");
        q = q.or(`name.ilike.%${escaped}%,city.ilike.%${escaped}%,zoektermen.ilike.%${escaped}%`);
      }
      if (p.orgType !== "all") q = q.eq("type", p.orgType);
      if (p.province !== "all") q = q.eq("province", p.province);
      if (p.language !== "all") q = q.eq("language", p.language);
      if (p.status !== "all") q = q.eq("status", p.status);
      if (p.niveau && p.niveau !== "all") q = q.eq("onderwijsniveau", p.niveau);
      if (p.schoolType && p.schoolType !== "all") q = q.eq("school_type", p.schoolType);
      if (p.schoolbestuurNr) q = q.eq("schoolbestuur_nr", p.schoolbestuurNr);
      if (p.scholengemeenschapNr) q = q.eq("scholengemeenschap_nr", p.scholengemeenschapNr);
      if (p.stemOnly) q = q.eq("heeft_stem", true);
      if (p.hierarchical) q = q.is("parent_id", null);
      q = q.order(p.sortKey, { ascending: p.sortDir === "asc" });
      const from = (p.page - 1) * p.pageSize;
      const to = from + p.pageSize - 1;
      q = q.range(from, to);
      const { data, error, count } = await q;
      if (error) { console.error("Error fetching paged organisaties:", error); throw error; }
      const rows = (data ?? []) as unknown as PagedOrgRow[];
      const campusesByParent: Record<string, PagedOrgRow[]> = {};
      if (p.hierarchical && rows.length > 0) {
        const parentIds = rows.map((r) => r.id);
        const { data: campData } = await supabase
          .from("organisaties")
          .select(select)
          .in("parent_id", parentIds)
          .order("name", { ascending: true })
          .range(0, 9999);
        ((campData ?? []) as unknown as PagedOrgRow[]).forEach((c) => {
          if (!c.parent_id) return;
          (campusesByParent[c.parent_id] ??= []).push(c);
        });
        rows.forEach((r) => { r.childCount = (campusesByParent[r.id] ?? []).length; });
      } else if (rows.length > 0) {
        // For flat/filter mode, compute child counts for top-level visible rows only.
        const topIds = rows.filter((r) => !r.parent_id).map((r) => r.id);
        if (topIds.length > 0) {
          const { data: childRows } = await supabase
            .from("organisaties")
            .select("id, parent_id")
            .in("parent_id", topIds)
            .range(0, 9999);
          const tally: Record<string, number> = {};
          ((childRows ?? []) as any[]).forEach((c) => {
            if (!c.parent_id) return;
            tally[c.parent_id] = (tally[c.parent_id] ?? 0) + 1;
          });
          rows.forEach((r) => { if (!r.parent_id) r.childCount = tally[r.id] ?? 0; });
        }
      }
      return { rows, campusesByParent, totalCount: count ?? 0 };
    },
    staleTime: 30 * 1000,
  });
}

// Distinct school_type values (used for filter dropdown).
export function useSchoolTypeOptions() {
  return useQuery({
    queryKey: ["school-type-options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organisaties")
        .select("school_type")
        .not("school_type", "is", null)
        .neq("school_type", "")
        .range(0, 9999);
      const set = new Set<string>();
      ((data ?? []) as any[]).forEach((r) => { if (r.school_type) set.add(r.school_type); });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Server-side typeahead for schoolbestuur (SO only). Returns distinct {nr, name}.
export function useSchoolbestuurSearch(term: string) {
  return useQuery({
    queryKey: ["schoolbestuur-search", term],
    queryFn: async () => {
      let q: any = supabase
        .from("organisaties")
        .select("schoolbestuur, schoolbestuur_nr")
        .eq("onderwijsniveau", "SO")
        .not("schoolbestuur_nr", "is", null);
      const t = term.trim();
      if (t) q = q.ilike("schoolbestuur", `%${t.replace(/[%,]/g, " ")}%`);
      q = q.order("schoolbestuur", { ascending: true }).range(0, 499);
      const { data } = await q;
      const map = new Map<string, string>();
      ((data ?? []) as any[]).forEach((r) => {
        if (r.schoolbestuur_nr && !map.has(r.schoolbestuur_nr)) {
          map.set(r.schoolbestuur_nr, r.schoolbestuur ?? "");
        }
      });
      return Array.from(map.entries()).map(([nr, name]) => ({ nr, name }));
    },
    staleTime: 60 * 1000,
  });
}

// Server-side typeahead for scholengemeenschap (SO only).
export function useScholengemeenschapSearch(term: string) {
  return useQuery({
    queryKey: ["scholengemeenschap-search", term],
    queryFn: async () => {
      let q: any = supabase
        .from("organisaties")
        .select("scholengemeenschap, scholengemeenschap_nr")
        .eq("onderwijsniveau", "SO")
        .not("scholengemeenschap_nr", "is", null);
      const t = term.trim();
      if (t) q = q.ilike("scholengemeenschap", `%${t.replace(/[%,]/g, " ")}%`);
      q = q.order("scholengemeenschap", { ascending: true }).range(0, 499);
      const { data } = await q;
      const map = new Map<string, string>();
      ((data ?? []) as any[]).forEach((r) => {
        if (r.scholengemeenschap_nr && !map.has(r.scholengemeenschap_nr)) {
          map.set(r.scholengemeenschap_nr, r.scholengemeenschap ?? "");
        }
      });
      return Array.from(map.entries()).map(([nr, name]) => ({ nr, name }));
    },
    staleTime: 60 * 1000,
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

// Fetch a single organisatie directly by id (bypasses any list cap).
// Also returns its parent (if any), campuses, verbonden_instelling and opleidingen.
export function useOrganisatieDetail(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["organisatie-detail", id],
    queryFn: async () => {
      const { data: org, error } = await supabase
        .from("organisaties")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!org) return { org: null, parent: null, campuses: [], verbondenInstelling: null, opleidingen: [] };

      const [parentRes, campusesRes, verbondenRes, opleidingenRes] = await Promise.all([
        org.parent_id
          ? supabase.from("organisaties").select("id,name").eq("id", org.parent_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("organisaties")
          .select("id, name, type, city, province, status, parent_id")
          .eq("parent_id", id!)
          .order("name", { ascending: true })
          .range(0, 9999),
        (org as any).verbonden_instelling_id
          ? supabase.from("organisaties").select("id,name").eq("id", (org as any).verbonden_instelling_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("opleidingen")
          .select("*")
          .eq("organisatie_id", id!)
          .order("name", { ascending: true })
          .range(0, 9999),
      ]);

      return {
        org: org as unknown as School,
        parent: (parentRes.data ?? null) as { id: string; name: string } | null,
        campuses: (campusesRes.data ?? []) as unknown as School[],
        verbondenInstelling: (verbondenRes.data ?? null) as { id: string; name: string } | null,
        opleidingen: (opleidingenRes.data ?? []) as any[],
      };
    },
    staleTime: 30 * 1000,
  });
}
