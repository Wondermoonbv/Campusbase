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
      writeAuditLog({ action: "delete", entity_type: "school", entity_id: id, entity_name: name });
    },
  });

  return { scholen, isLoading, upsertSchool, deleteSchool };
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
