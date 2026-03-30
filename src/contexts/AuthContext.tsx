import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/supabase-helpers";

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
  loading: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  users: AppUser[];
  addUser: (user: Omit<AppUser, "id" | "notifications"> & Partial<Pick<AppUser, "notifications">>) => void;
  updateUser: (id: string, data: Partial<Omit<AppUser, "id">>) => void;
  deleteUser: (id: string) => void;
  updateProfile: (data: Partial<Omit<AppUser, "id" | "role">>) => void;
  changePassword: (current: string, newPass: string) => Promise<boolean>;
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

const PLATFORM_KEY = "elia_crm_platform";
const AuthContext = createContext<AuthContextType | null>(null);

async function loadAppUser(userId: string, email?: string): Promise<AppUser | null> {
  const [profileRes, rolesRes] = await Promise.all([
    db("profiles").select("*").eq("id", userId).single(),
    db("user_roles").select("role").eq("user_id", userId),
  ]);

  if (profileRes.error) {
    // Profile might not exist yet if trigger hasn't fired
    return {
      id: userId,
      firstName: "",
      lastName: "",
      name: email ?? "",
      email: email ?? "",
      role: "viewer",
      notifications: { ...DEFAULT_NOTIFICATIONS },
    };
  }

  const p = profileRes.data as any;
  const role = ((rolesRes.data as any[])?.[0]?.role ?? "viewer") as UserRole;

  return {
    id: userId,
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email,
    email: p.email ?? email ?? "",
    role,
    avatarUrl: p.avatar_url || undefined,
    notifications: { ...DEFAULT_NOTIFICATIONS },
  };
}

async function loadAllUsers(): Promise<AppUser[]> {
  const [profilesRes, rolesRes] = await Promise.all([
    db("profiles").select("*").order("first_name"),
    db("user_roles").select("*"),
  ]);
  const profiles = (profilesRes.data as any[]) ?? [];
  const roles = (rolesRes.data as any[]) ?? [];
  return profiles.map((p) => ({
    id: p.id,
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email,
    email: p.email ?? "",
    role: (roles.find((r) => r.user_id === p.id)?.role ?? "viewer") as UserRole,
    avatarUrl: p.avatar_url || undefined,
    notifications: { ...DEFAULT_NOTIFICATIONS },
  }));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    const stored = localStorage.getItem(PLATFORM_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PLATFORM;
  });

  useEffect(() => {
    localStorage.setItem(PLATFORM_KEY, JSON.stringify(platformSettings));
  }, [platformSettings]);

  useEffect(() => {
    let mounted = true;

    // 1. Set up auth listener FIRST (before getSession) to catch all state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        // Use setTimeout to prevent Supabase deadlock when calling DB inside auth callback
        setTimeout(async () => {
          if (!mounted) return;
          const appUser = await loadAppUser(session.user.id, session.user.email);
          if (mounted) {
            setUser(appUser);
            setLoading(false);
            loadAllUsers().then((u) => mounted && setUsers(u));
          }
        }, 0);
      } else {
        setUser(null);
        setUsers([]);
        setLoading(false);
      }
    });

    // 2. Then check existing session from localStorage
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const appUser = await loadAppUser(session.user.id, session.user.email);
        if (mounted) {
          setUser(appUser);
          loadAllUsers().then((u) => mounted && setUsers(u));
        }
      }
      if (mounted) setLoading(false);
    }).catch(() => {
      // If getSession fails (e.g. network), stop loading anyway
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });
    return !error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUsers([]);
  }, []);

  const addUser = useCallback((_data: any) => {
    // Cannot create auth users from client-side
    console.warn("Creating users requires the Supabase dashboard.");
  }, []);

  const updateUser = useCallback(async (id: string, data: Partial<Omit<AppUser, "id">>) => {
    const updates: any = {};
    if (data.firstName !== undefined) updates.first_name = data.firstName;
    if (data.lastName !== undefined) updates.last_name = data.lastName;
    if (data.email !== undefined) updates.email = data.email;
    if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;

    if (Object.keys(updates).length > 0) {
      await db("profiles").update(updates).eq("id", id);
    }

    if (data.role) {
      await db("user_roles").delete().eq("user_id", id);
      await db("user_roles").insert({ user_id: id, role: data.role });
    }

    const allUsers = await loadAllUsers();
    setUsers(allUsers);

    if (user?.id === id) {
      const updated = allUsers.find((u) => u.id === id);
      if (updated) setUser(updated);
    }
  }, [user]);

  const deleteUser = useCallback((_id: string) => {
    console.warn("Deleting users requires the Supabase dashboard.");
  }, []);

  const updateProfile = useCallback(async (data: Partial<Omit<AppUser, "id" | "role">>) => {
    if (!user) return;
    const updates: any = {};
    if (data.firstName !== undefined) updates.first_name = data.firstName;
    if (data.lastName !== undefined) updates.last_name = data.lastName;
    if (data.email !== undefined) updates.email = data.email;
    if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;

    if (Object.keys(updates).length > 0) {
      await db("profiles").update(updates).eq("id", user.id);
    }

    const updated = { ...user, ...data };
    if (data.firstName || data.lastName) {
      updated.name = `${data.firstName ?? user.firstName} ${data.lastName ?? user.lastName}`;
    }
    setUser(updated);
  }, [user]);

  const changePassword = useCallback(async (_current: string, newPass: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    return !error;
  }, []);

  const updatePlatformSettings = useCallback((data: Partial<PlatformSettings>) => {
    setPlatformSettings((prev) => ({ ...prev, ...data }));
  }, []);

  const isAdmin = user?.role === "admin";
  const canEdit = user?.role === "admin" || user?.role === "editor";

  return (
    <AuthContext.Provider value={{
      user, loading, isAdmin, canEdit,
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
