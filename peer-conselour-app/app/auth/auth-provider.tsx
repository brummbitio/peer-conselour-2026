"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, JWT_KEY } from "@/utils/api";
import { useRouter } from "next/navigation";
import { clearPortalCaches } from "../_portal/dataCache";

export type AuthUser = {
  role: AuthRole;
  nim: string;
  fullName: string;
  gender?: string;
  faculty?: string;
  department?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
};

export type AuthRole = "student" | "admin" | "superadmin";

type RegisterPayload = {
  nim: string;
  fullName: string;
  gender: string;
  faculty: string;
  department: string;
  email: string;
  phone: string;
};

type CreateAdminPayload = {
  email: string;
  role: AuthRole;
};

type UpdateAdminPayload = {
  nim: string;
  fullName: string;
  email: string;
  role: AuthRole;
  isActive: boolean;
};

type ResetAdminPasswordPayload = {
  nim: string;
  password: string;
};

type UpdateStudentProfilePayload = {
  nim: string;
  fullName: string;
  gender: string;
  faculty: string;
  department: string;
  email: string;
  phone: string;
  password?: string;
};

type AuthResult = {
  ok: boolean;
  message?: string;
  user?: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  adminAccounts: AuthUser[];

  createAdmin: (payload: CreateAdminPayload) => Promise<AuthResult>;
  updateAdmin: (payload: UpdateAdminPayload) => Promise<AuthResult>;
  resetAdminPassword: (payload: ResetAdminPasswordPayload) => Promise<AuthResult>;
  updateStudentProfile: (payload: UpdateStudentProfilePayload) => Promise<AuthResult>;
  logout: () => void;
  actualRole: AuthRole | null;
  switchRole: (role: AuthRole) => void;
};


const AuthContext = createContext<AuthContextValue | null>(null);

export function isAdminRole(role?: AuthRole | null): role is "admin" | "superadmin" {
  return role === "admin" || role === "superadmin";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [adminAccounts, setAdminAccounts] = useState<AuthUser[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [actualRole, setActualRole] = useState<AuthRole | null>(null);
  const [activeRoleOverride, setActiveRoleOverride] = useState<AuthRole | null>(null);
  const router = useRouter();

  // Initialize auth state: Check for OIDC redirect query params, local storage, or httpOnly cookie session
  useEffect(() => {
    async function initAuth() {
      try {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const tokenParam = params.get("token");
          const ssoSuccess = params.get("sso") === "success";
          let justLoggedIn = ssoSuccess;

          if (tokenParam) {
            localStorage.setItem(JWT_KEY, tokenParam);
            justLoggedIn = true;
            // Clean up token query param from browser address bar
            const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]token=[^&]+/, "").replace(/^[?&]/, "?");
            window.history.replaceState({}, document.title, cleanUrl === "?" ? window.location.pathname : cleanUrl);
          }

          if (ssoSuccess) {
            // Clean up sso query param
            const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]sso=[^&]+/, "").replace(/^[?&]/, "?");
            window.history.replaceState({}, document.title, cleanUrl === "?" ? window.location.pathname : cleanUrl);
          }

          // Coba panggil /api/auth/me. Jika httpOnly cookie ada, backend akan memvalidasinya secara otomatis.
          try {
            const me = await api.get("/api/auth/me");
            setActualRole(me.role);
            const savedOverride = localStorage.getItem("ub_counseling_role_override") as AuthRole | null;
            if (savedOverride) {
              setActiveRoleOverride(savedOverride);
            }
            setUser({
              role: me.role,
              nim: me.nim || "",
              fullName: me.full_name,
              gender: me.gender || undefined,
              faculty: me.faculty || undefined,
              department: me.department || undefined,
              email: me.email || undefined,
              phone: me.phone || undefined,
              address: me.address || undefined,
            });

            if (justLoggedIn) {
              if (me.role === "admin" || me.role === "superadmin") {
                router.replace("/admin/dashboard");
              } else {
                router.replace("/my-counseling");
              }
            }
          } catch (err) {
            // Jika request /me gagal (belum login atau cookie kedaluwarsa)
            clearPortalCaches();
            setUser(null);
            setActualRole(null);
            setActiveRoleOverride(null);
            localStorage.removeItem("ub_counseling_role_override");
            localStorage.removeItem(JWT_KEY);
          }
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
        if (typeof window !== "undefined") {
          localStorage.removeItem(JWT_KEY);
          localStorage.removeItem("ub_counseling_role_override");
        }
        setUser(null);
        setActualRole(null);
        setActiveRoleOverride(null);
      } finally {
        setIsReady(true);
      }
    }
    initAuth();
  }, []);

  // Fetch admin accounts list if logged in user is admin/superadmin
  useEffect(() => {
    async function fetchAdmins() {
      if (user && isAdminRole(user.role)) {
        try {
          const list = await api.get("/api/admin/admins");
          setAdminAccounts(
            list.map((u: any) => ({
              role: u.role,
              nim: String(u.id), // Use numeric ID as NIM key for admin lists
              fullName: u.full_name,
              gender: u.gender || undefined,
              faculty: u.faculty || undefined,
              department: u.department || undefined,
              email: u.email || undefined,
              phone: u.phone || undefined,
              isActive: u.is_active !== undefined ? u.is_active : (u.isactive !== undefined ? u.isactive : true),
            }))
          );
        } catch (err) {
          console.error("Failed to load admin list:", err);
        }
      } else {
        setAdminAccounts([]);
      }
    }
    fetchAdmins();
  }, [user]);



  const createAdmin = useCallback(async (payload: CreateAdminPayload): Promise<AuthResult> => {
    try {
      const created = await api.post("/api/admin/admins", {
        email: payload.email,
        role: payload.role,
      });
      const newAdmin: AuthUser = {
        role: created.role,
        nim: String(created.id),
        fullName: created.full_name || payload.email.split("@")[0],
        gender: created.gender || undefined,
        faculty: created.faculty || undefined,
        department: created.department || undefined,
        email: created.email || undefined,
        phone: created.phone || undefined,
        isActive: true,
      };
      setAdminAccounts((prev) => [newAdmin, ...prev]);
      return { ok: true, user: newAdmin, message: "Admin baru berhasil dibuat." };
    } catch (err: any) {
      return { ok: false, message: err.message || "Gagal membuat admin baru" };
    }
  }, []);

  const updateAdmin = useCallback(async (payload: UpdateAdminPayload): Promise<AuthResult> => {
    try {
      const idVal = parseInt(payload.nim, 10);
      const updated = await api.put(`/api/admin/admins/${idVal}`, {
        full_name: payload.fullName,
        email: payload.email,
        role: payload.role,
        is_active: payload.isActive,
      });
      const updatedAdmin: AuthUser = {
        role: updated.role,
        nim: String(updated.id),
        fullName: updated.full_name,
        gender: updated.gender || undefined,
        faculty: updated.faculty || undefined,
        department: updated.department || undefined,
        email: updated.email || undefined,
        phone: updated.phone || undefined,
        isActive: updated.is_active !== undefined ? updated.is_active : true,
      };
      setAdminAccounts((prev) =>
        prev.map((a) => (a.nim === payload.nim ? updatedAdmin : a))
      );
      return { ok: true, user: updatedAdmin, message: "Data admin berhasil diperbarui." };
    } catch (err: any) {
      return { ok: false, message: err.message || "Gagal memperbarui data admin." };
    }
  }, []);

  const resetAdminPassword = useCallback(async (payload: ResetAdminPasswordPayload): Promise<AuthResult> => {
    try {
      const idVal = parseInt(payload.nim, 10);
      await api.post(`/api/admin/admins/${idVal}/reset-password`, {
        password: payload.password,
      });
      return { ok: true, message: "Password admin berhasil direset." };
    } catch (err: any) {
      return { ok: false, message: err.message || "Gagal mereset password admin." };
    }
  }, []);

  const updateStudentProfile = useCallback(async (payload: UpdateStudentProfilePayload): Promise<AuthResult> => {
    try {
      const updated = await api.put("/api/auth/profile", {
        full_name: payload.fullName,
        gender: payload.gender,
        faculty: payload.faculty,
        department: payload.department,
        phone: payload.phone,
      });
      const nextUser: AuthUser = {
        role: updated.role,
        nim: updated.nim || "",
        fullName: updated.full_name,
        gender: updated.gender || undefined,
        faculty: updated.faculty || undefined,
        department: updated.department || undefined,
        email: updated.email || undefined,
        phone: updated.phone || undefined,
      };
      setUser(nextUser);
      return { ok: true, user: nextUser, message: "Profil berhasil diperbarui." };
    } catch (err: any) {
      return { ok: false, message: err.message || "Gagal memperbarui profil." };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout", {});
    } catch (err) {
      console.error("Gagal melakukan API logout:", err);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(JWT_KEY);
      localStorage.removeItem("ub_counseling_role_override");
    }
    // Data tiket & mahasiswa yang di-cache di memori tidak boleh tertinggal setelah logout
    clearPortalCaches();
    setUser(null);
    setActualRole(null);
    setActiveRoleOverride(null);
  }, []);

  const switchRole = useCallback((targetRole: AuthRole) => {
    if (actualRole === "student" && targetRole !== "student") return;
    setActiveRoleOverride(targetRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("ub_counseling_role_override", targetRole);
    }
  }, [actualRole]);

  const contextUser = useMemo(() => {
    if (!user) return null;
    return {
      ...user,
      role: activeRoleOverride || user.role,
    };
  }, [user, activeRoleOverride]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: contextUser,
      isReady,
      adminAccounts,

      createAdmin,
      updateAdmin,
      resetAdminPassword,
      updateStudentProfile,
      logout,
      actualRole,
      switchRole,
    }),
    [
      contextUser,
      isReady,
      adminAccounts,

      createAdmin,
      updateAdmin,
      resetAdminPassword,
      updateStudentProfile,
      logout,
      actualRole,
      switchRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
