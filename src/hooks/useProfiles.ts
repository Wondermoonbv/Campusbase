import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  full_name: string;
}

export function useProfiles() {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("active", true)
        .order("first_name");
      if (error) { console.error(error); return []; }
      return (data ?? []).map((p: any) => ({
        id: p.id,
        full_name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email,
      })) as TeamMember[];
    },
  });

  const resolveAssignee = (assignedTo: string | null | undefined): string => {
    if (!assignedTo) return "–";
    const profile = profiles.find((p) => p.id === assignedTo);
    if (profile) return profile.full_name;
    // Graceful fallback: if it's a plain text name (legacy), show as-is
    return assignedTo;
  };

  return { profiles, isLoading, resolveAssignee };
}
