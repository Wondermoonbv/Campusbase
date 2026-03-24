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
  { id: "a1", userId: "u1", userName: "Admin User", action: "aangemaakt", entityType: "taak", entityName: "Stand materiaal bestellen voor Career Day UGent", timestamp: new Date(Date.now() - 1 * 3600000).toISOString() },
  { id: "a2", userId: "u1", userName: "Admin User", action: "bewerkt", entityType: "evenement", entityName: "Career Day UGent", timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "a3", userId: "u2", userName: "Viewer User", action: "aangemaakt", entityType: "contract", entityName: "Thomas More partnerschap", timestamp: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: "a4", userId: "u1", userName: "Admin User", action: "bewerkt", entityType: "school", entityName: "KU Leuven", timestamp: new Date(Date.now() - 6 * 3600000).toISOString() },
  { id: "a5", userId: "u2", userName: "Viewer User", action: "aangemaakt", entityType: "taak", entityName: "Hackathon jury samenstellen", timestamp: new Date(Date.now() - 8 * 3600000).toISOString() },
  { id: "a6", userId: "u1", userName: "Admin User", action: "verwijderd", entityType: "opleiding", entityName: "Oude opleiding Chemie", timestamp: new Date(Date.now() - 12 * 3600000).toISOString() },
  { id: "a7", userId: "u1", userName: "Admin User", action: "aangemaakt", entityType: "evenement", entityName: "Workshop Smart Grids VUB", timestamp: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: "a8", userId: "u2", userName: "Viewer User", action: "bewerkt", entityType: "contract", entityName: "VUB partnerschap", timestamp: new Date(Date.now() - 28 * 3600000).toISOString() },
  { id: "a9", userId: "u1", userName: "Admin User", action: "aangemaakt", entityType: "school", entityName: "HOGENT", timestamp: new Date(Date.now() - 48 * 3600000).toISOString() },
  { id: "a10", userId: "u2", userName: "Viewer User", action: "bewerkt", entityType: "taak", entityName: "VUB partnerschap evaluatie voorbereiden", timestamp: new Date(Date.now() - 72 * 3600000).toISOString() },
  { id: "a11", userId: "u1", userName: "Admin User", action: "aangemaakt", entityType: "evenement", entityName: "Jobbeurs KU Leuven", timestamp: new Date(Date.now() - 120 * 3600000).toISOString() },
  { id: "a12", userId: "u1", userName: "Admin User", action: "bewerkt", entityType: "school", entityName: "UGent", timestamp: new Date(Date.now() - 168 * 3600000).toISOString() },
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
