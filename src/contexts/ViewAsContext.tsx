import { createContext, useContext, useState, useCallback } from "react";
import { useAuth, type UserRole } from "@/contexts/AuthContext";

interface SimulatedUser {
  name: string;
  role: UserRole;
}

interface ViewAsContextType {
  simulatedRole: UserRole | null;
  simulatedUserName: string | null;
  setSimulatedRole: (role: UserRole | null) => void;
  simulateUser: (name: string, role: UserRole) => void;
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
  const [simulated, setSimulated] = useState<SimulatedUser | null>(null);

  const realRole = user?.role ?? "viewer";
  const isRealAdmin = realRole === "admin";

  const simulatedRole = simulated?.role ?? null;
  const simulatedUserName = simulated?.name ?? null;

  // Only admins can simulate; if not admin, ignore simulation
  const effectiveRole: UserRole = isRealAdmin && simulatedRole ? simulatedRole : realRole;
  const isSimulating = isRealAdmin && simulatedRole !== null && simulatedRole !== "admin";

  const effectiveIsAdmin = effectiveRole === "admin";
  const effectiveCanEdit = effectiveRole === "admin" || effectiveRole === "editor";
  const effectiveIsStandenbouwer = effectiveRole === "standenbouwer";

  const setSimulatedRole = useCallback((role: UserRole | null) => {
    if (!role || role === "admin") {
      setSimulated(null);
    } else {
      setSimulated({ name: role, role });
    }
  }, []);

  const simulateUser = useCallback((name: string, role: UserRole) => {
    if (role === "admin") {
      setSimulated(null);
    } else {
      setSimulated({ name, role });
    }
  }, []);

  const resetSimulation = useCallback(() => setSimulated(null), []);

  return (
    <ViewAsContext.Provider value={{
      simulatedRole,
      simulatedUserName,
      setSimulatedRole,
      simulateUser,
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
