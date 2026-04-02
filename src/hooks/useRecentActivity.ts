import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityItem {
  id: string;
  type: "inschrijving" | "feedback" | "event" | "school";
  label: string;
  timestamp: string;
  link: string;
}

export function useRecentActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: ["recent-activity"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [inschrijvingen, feedback, events, scholen] = await Promise.all([
        supabase
          .from("event_inschrijvingen")
          .select("id, ingeschreven_op, ambassadeur_id, evenement_id, ambassadeurs(full_name), evenementen(name)")
          .order("ingeschreven_op", { ascending: false })
          .limit(5),
        supabase
          .from("feedback_responses")
          .select("id, submitted_at, form_id, feedback_forms(title, evenement_id, evenementen(name))")
          .order("submitted_at", { ascending: false })
          .limit(5),
        supabase
          .from("evenementen")
          .select("id, name, date")
          .order("date", { ascending: false })
          .limit(5),
        supabase
          .from("scholen")
          .select("id, name, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const items: ActivityItem[] = [];

      (inschrijvingen.data ?? []).forEach((i: any) => {
        const ambName = i.ambassadeurs?.full_name ?? "Onbekend";
        const evName = i.evenementen?.name ?? "onbekend event";
        items.push({
          id: `insc-${i.id}`,
          type: "inschrijving",
          label: `${ambName} heeft zich ingeschreven voor ${evName}`,
          timestamp: i.ingeschreven_op ?? "",
          link: `/evenementen/${i.evenement_id}`,
        });
      });

      (feedback.data ?? []).forEach((f: any) => {
        const form = f.feedback_forms as any;
        const evName = form?.evenementen?.name ?? "onbekend event";
        const evId = form?.evenement_id;
        items.push({
          id: `fb-${f.id}`,
          type: "feedback",
          label: `Nieuwe feedback ontvangen voor ${evName}`,
          timestamp: f.submitted_at ?? "",
          link: evId ? `/evenementen/${evId}` : "/evenementen",
        });
      });

      (events.data ?? []).forEach((e: any) => {
        items.push({
          id: `ev-${e.id}`,
          type: "event",
          label: `Nieuw event aangemaakt: ${e.name}`,
          timestamp: e.date ?? "",
          link: `/evenementen/${e.id}`,
        });
      });

      (scholen.data ?? []).forEach((s: any) => {
        items.push({
          id: `sch-${s.id}`,
          type: "school",
          label: `Nieuwe school toegevoegd: ${s.name}`,
          timestamp: s.created_at ?? "",
          link: `/scholen/${s.id}`,
        });
      });

      return items
        .filter((i) => i.timestamp)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
  });
}
