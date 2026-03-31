import { createContext, useContext, useState, useCallback } from "react";
import { useAuth, type UserRole } from "@/contexts/AuthContext";

interface ViewAsContextType {
  simulatedRole: UserRole | null;
  setSimulatedRole: (role: UserRole | null) => void;
  effectiveRole: UserRole;
  isSimulating: boolean;
  effectiveIsAdmin: boolean;
  effectiveCanEdit: boolean;
  effectiveIsStandenbouwer: boolean;
  resetSimulation: () => void;
}

const ViewAsContext = createContext<ViewAsContextType | null>(null);

export function ViewAsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);

  const realRole = user?.role ?? "viewer";
  const isRealAdmin = realRole === "admin";

  // Only admins can simulate; if not admin, ignore simulation
  const effectiveRole: UserRole = isRealAdmin && simulatedRole ? simulatedRole : realRole;
  const isSimulating = isRealAdmin && simulatedRole !== null && simulatedRole !== "admin";

  const effectiveIsAdmin = effectiveRole === "admin";
  const effectiveCanEdit = effectiveRole === "admin" || effectiveRole === "editor";
  const effectiveIsStandenbouwer = effectiveRole === "standenbouwer";

  const resetSimulation = useCallback(() => setSimulatedRole(null), []);

  return (
    <ViewAsContext.Provider value={{
      simulatedRole,
      setSimulatedRole,
      effectiveRole,
      isSimulating,
      effectiveIsAdmin,
      effectiveCanEdit,
      effectiveIsStandenbouwer,
      resetSimulation,
    }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error("useViewAs must be used within ViewAsProvider");
  return ctx;
}
