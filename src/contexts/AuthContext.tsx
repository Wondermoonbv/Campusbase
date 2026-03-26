import { createContext, useContext, useState, useCallback, useEffect } from "react";

export type UserRole = "admin" | "editor" | "viewer";

export interface NotificationSettings {
  contractExpiry90: boolean;
  eventReminder7: boolean;
  weeklyEventDigest: boolean;
}

export interface PlatformSettings {
  defaultLanguage: "nl" | "fr" | "en";
  defaultEventView: "list" | "calendar";
  companyName: string;
  companyLogoUrl: string;
}

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  notifications: NotificationSettings;
}

interface AuthContextType {
  user: AppUser | null;
  isAdmin: boolean;
  /** Admin or Editor — can create/edit/delete entities */
  canEdit: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  users: AppUser[];
  addUser: (user: Omit<AppUser, "id" | "notifications"> & Partial<Pick<AppUser, "notifications">>) => void;
  updateUser: (id: string, data: Partial<Omit<AppUser, "id">>) => void;
  deleteUser: (id: string) => void;
  updateProfile: (data: Partial<Omit<AppUser, "id" | "role">>) => void;
  changePassword: (current: string, newPass: string) => boolean;
  platformSettings: PlatformSettings;
  updatePlatformSettings: (data: Partial<PlatformSettings>) => void;
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  contractExpiry90: true,
  eventReminder7: true,
  weeklyEventDigest: false,
};

const DEFAULT_PLATFORM: PlatformSettings = {
  defaultLanguage: "nl",
  defaultEventView: "list",
  companyName: "CampusBase",
  companyLogoUrl: "",
};

const DEFAULT_USERS: AppUser[] = [
  { id: "u1", firstName: "Matthias", lastName: "Peeters", name: "Matthias Peeters", email: "matthias.peeters@elia.be", role: "admin", notifications: { ...DEFAULT_NOTIFICATIONS } },
  { id: "u2", firstName: "Ellen", lastName: "Geerts", name: "Ellen Geerts", email: "ellen.geerts@elia.be", role: "editor", notifications: { ...DEFAULT_NOTIFICATIONS } },
  { id: "u3", firstName: "Naomi", lastName: "Geyskens", name: "Naomi Geyskens", email: "naomi.geyskens@elia.be", role: "editor", notifications: { ...DEFAULT_NOTIFICATIONS } },
  { id: "u4", firstName: "Sarah", lastName: "Zekhnini", name: "Sarah Zekhnini", email: "sarah.zekhnini@elia.be", role: "editor", notifications: { ...DEFAULT_NOTIFICATIONS } },
  { id: "u5", firstName: "Eline", lastName: "ten Cate", name: "Eline ten Cate", email: "eline.tencate@elia.be", role: "editor", notifications: { ...DEFAULT_NOTIFICATIONS } },
  { id: "u6", firstName: "Elke", lastName: "Vanton", name: "Elke Vanton", email: "elke.vanton@elia.be", role: "editor", notifications: { ...DEFAULT_NOTIFICATIONS } },
];

/** Mock password store — email → password */
const PASSWORDS: Record<string, string> = {
  "matthias.peeters@elia.be": "iktestgraag1234",
  "ellen.geerts@elia.be": "iktestgraag1234",
  "elke.vanton@elia.be": "iktestgraag1234",
  "naomi.geyskens@elia.be": "iktestgraag1234",
  "sarah.zekhnini@elia.be": "iktestgraag1234",
  "eline.tencate@elia.be": "iktestgraag1234",
};

const STORAGE_KEY = "elia_crm_auth";
const USERS_KEY = "elia_crm_users";
const PLATFORM_KEY = "elia_crm_platform";
const DATA_VERSION_KEY = "elia_crm_version";
const CURRENT_VERSION = "2";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Reset stale localStorage when data version changes
  const needsReset = localStorage.getItem(DATA_VERSION_KEY) !== CURRENT_VERSION;
  if (needsReset) {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PLATFORM_KEY);
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_VERSION);
  }

  const [users, setUsers] = useState<AppUser[]>(() => {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_USERS;
  });

  // Start logged out — user must log in
  const [user, setUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    const stored = localStorage.getItem(PLATFORM_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PLATFORM;
  });

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(PLATFORM_KEY, JSON.stringify(platformSettings));
  }, [platformSettings]);

  const login = useCallback((email: string, password: string) => {
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return false;
    const expectedPass = PASSWORDS[found.email.toLowerCase()];
    if (expectedPass && password !== expectedPass) return false;
    setUser(found);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    return true;
  }, [users]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const addUser = useCallback((data: Omit<AppUser, "id" | "notifications"> & Partial<Pick<AppUser, "notifications">>) => {
    const newUser: AppUser = {
      ...data,
      id: `u${Date.now()}`,
      notifications: data.notifications ?? { ...DEFAULT_NOTIFICATIONS },
    };
    setUsers((prev) => [...prev, newUser]);
  }, []);

  const updateUser = useCallback((id: string, data: Partial<Omit<AppUser, "id">>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
    setUser((curr) => curr?.id === id ? { ...curr, ...data } : curr);
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const updateProfile = useCallback((data: Partial<Omit<AppUser, "id" | "role">>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    if (data.firstName || data.lastName) {
      updated.name = `${data.firstName ?? user.firstName} ${data.lastName ?? user.lastName}`;
    }
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }, [user]);

  const changePassword = useCallback((_current: string, _newPass: string) => {
    return true;
  }, []);

  const updatePlatformSettings = useCallback((data: Partial<PlatformSettings>) => {
    setPlatformSettings((prev) => ({ ...prev, ...data }));
  }, []);

  const isAdmin = user?.role === "admin";
  const canEdit = user?.role === "admin" || user?.role === "editor";

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      canEdit,
      login, logout, users, addUser, updateUser, deleteUser,
      updateProfile, changePassword,
      platformSettings, updatePlatformSettings,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
