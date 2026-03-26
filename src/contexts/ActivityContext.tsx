import { createContext, useContext, useState, useCallback } from "react";

export type ActivityAction = "aangemaakt" | "bewerkt" | "verwijderd";
export type ActivityEntityType = "school" | "evenement" | "contract" | "opleiding" | "taak";

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityName: string;
  timestamp: string; // ISO string
}

interface ActivityContextType {
  activities: Activity[];
  logActivity: (data: Omit<Activity, "id" | "timestamp">) => void;
}

const ActivityContext = createContext<ActivityContextType | null>(null);

const SEED_ACTIVITIES: Activity[] = [
  { id: "a1", userId: "u1", userName: "Matthias Peeters", action: "aangemaakt", entityType: "taak", entityName: "Stand materiaal bestellen voor Career Day KU Leuven", timestamp: new Date(Date.now() - 1 * 3600000).toISOString() },
  { id: "a2", userId: "u2", userName: "Ellen Geerts", action: "bewerkt", entityType: "evenement", entityName: "Career Day KU Leuven", timestamp: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: "a3", userId: "u3", userName: "Naomi Geyskens", action: "aangemaakt", entityType: "school", entityName: "HOGENT", timestamp: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: "a4", userId: "u4", userName: "Sarah Zekhnini", action: "bewerkt", entityType: "contract", entityName: "KU Leuven partnerschap", timestamp: new Date(Date.now() - 48 * 3600000).toISOString() },
];

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>(SEED_ACTIVITIES);

  const logActivity = useCallback((data: Omit<Activity, "id" | "timestamp">) => {
    const activity: Activity = {
      ...data,
      id: `a${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [activity, ...prev]);
  }, []);

  return (
    <ActivityContext.Provider value={{ activities, logActivity }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivity must be used within ActivityProvider");
  return ctx;
}
