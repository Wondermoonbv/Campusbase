import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase-helpers";
import type { School, Contact } from "@/types/crm";

export function useScholen() {
  const qc = useQueryClient();

  const { data: scholen = [], isLoading } = useQuery({
    queryKey: ["scholen"],
    queryFn: async () => {
      const { data, error } = await db("scholen").select("*").order("name");
      if (error) { console.error("Error fetching scholen:", error); return []; }
      return data as School[];
    },
  });

  const upsertSchool = useMutation({
    mutationFn: async (school: Partial<School> & { name: string }) => {
      const { contacts, ...rest } = school as any;
      if (school.id) {
        const { id, created_at, ...updates } = rest;
        const { data, error } = await db("scholen").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return data as School;
      } else {
        const { id, created_at, ...insert } = rest;
        const { data, error } = await db("scholen").insert(insert).select().single();
        if (error) throw error;
        return data as School;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scholen"] }),
  });

  const deleteSchool = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db("scholen").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scholen"] }),
  });

  return { scholen, isLoading, upsertSchool, deleteSchool };
}

export function useContacten(schoolId?: string) {
  const qc = useQueryClient();

  const { data: contacten = [], isLoading } = useQuery({
    queryKey: ["contacten", schoolId],
    queryFn: async () => {
      let query = db("contacten").select("*");
      if (schoolId) query = query.eq("school_id", schoolId);
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data as Contact[];
    },
  });

  const upsertContact = useMutation({
    mutationFn: async (contact: Partial<Contact> & { name: string; school_id: string }) => {
      if (contact.id) {
        const { id, ...updates } = contact;
        const { data, error } = await db("contacten").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return data as Contact;
      } else {
        const { id, ...insert } = contact;
        const { data, error } = await db("contacten").insert(insert).select().single();
        if (error) throw error;
        return data as Contact;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacten"] }),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db("contacten").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacten"] }),
  });

  return { contacten, isLoading, upsertContact, deleteContact };
}
