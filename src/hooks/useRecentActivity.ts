import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityItem {
  id: string;
  type: "create" | "update" | "delete";
  entity_type: string;
  label: string;
  timestamp: string;
  user_email: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  create: "aangemaakt",
  update: "gewijzigd",
  delete: "verwijderd",
};

const ENTITY_LABELS: Record<string, string> = {
  school: "School",
  contact: "Contact",
  opleiding: "Opleiding",
  evenement: "Evenement",
  contract: "Contract",
  taak: "Taak",
  ambassadeur: "Ambassadeur",
  inschrijving: "Inschrijving",
};

export function useRecentActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: ["recent-activity"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) { console.error(error); return []; }

      return (data ?? []).map((entry: any) => ({
        id: entry.id,
        type: entry.action as ActivityItem["type"],
        entity_type: entry.entity_type,
        label: `${ENTITY_LABELS[entry.entity_type] ?? entry.entity_type} "${entry.entity_name ?? "?"}" ${ACTION_LABELS[entry.action] ?? entry.action}${entry.user_email ? ` door ${entry.user_email.split("@")[0]}` : ""}`,
        timestamp: entry.created_at ?? "",
        user_email: entry.user_email,
      }));
    },
  });
}
