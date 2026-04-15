"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthUser = {
  role: AuthRole;
  nim: string;
  fullName: string;
  gender?: string;
  faculty?: string;
  department?: string;
  email?: string;
  phone?: string;
};

export type AuthRole = "student" | "admin" | "superadmin";

type StoredAccount = AuthUser & {
  password: string;
};

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
  password: string;
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
  demoCredentials: { nim: string; password: string };
  adminDemoCredentials: { nim: string; password: string };
  login: (identifier: string, password: string) => AuthResult;
  register: (payload: RegisterPayload) => AuthResult;
  createAdmin: (payload: CreateAdminPayload) => AuthResult;
  canLoginWithCredential: (identifier: string, password: string) => boolean;
  isNimAvailable: (nim: string) => boolean;
  logout: () => void;
};

const SESSION_KEY = "ub_counseling_session";
const ACCOUNTS_KEY = "ub_counseling_accounts";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DUMMY_ACCOUNTS: StoredAccount[] = [
  {
    role: "student",
    nim: "2024100001",
    password: "ub2026demo",
    fullName: "Fernando",
    gender: "Laki-laki",
    faculty: "Fakultas Teknik",
    department: "Teknik Informatika",
    email: "fernando@student.ub.ac.id",
    phone: "081234567890",
  },
  {
    role: "student",
    nim: "2024100002",
    password: "ub2026demo",
    fullName: "Nadia",
    gender: "Perempuan",
    faculty: "Fakultas Ilmu Administrasi",
    department: "Administrasi Publik",
    email: "nadia@student.ub.ac.id",
    phone: "081398765432",
  },
  {
    role: "superadmin",
    nim: "1977000000",
    password: "admin2026",
    fullName: "Admin UB",
    gender: "Laki-laki",
    faculty: "Direktorat Kemahasiswaan",
    department: "Subdirektorat Konseling",
    email: "admin.konseling@ub.ac.id",
    phone: "081200000000",
  },
  {
    role: "admin",
    nim: "1977000001",
    password: "admin2026",
    fullName: "Admin Maya",
    gender: "Perempuan",
    faculty: "Direktorat Kemahasiswaan",
    department: "Subdirektorat Konseling",
    email: "maya.konseling@ub.ac.id",
    phone: "081233344455",
  },
];

const DEMO_ADMIN_ACCOUNT =
  DUMMY_ACCOUNTS.find((account) => account.role !== "student") ??
  DUMMY_ACCOUNTS[0];

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeRole(role: unknown): AuthRole {
  if (role === "admin" || role === "superadmin") {
    return role;
  }
  return "student";
}

export function isAdminRole(role?: AuthRole | null): role is "admin" | "superadmin" {
  return role === "admin" || role === "superadmin";
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim();
}

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? "";
}

function formatNameFromEmail(email: string) {
  const localPart = email.split("@")[0] || "admin";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function generateAdminNim(accounts: StoredAccount[]) {
  for (let index = 1; index < 100000; index += 1) {
    const candidate = `9${String(index).padStart(9, "0")}`;
    if (!accounts.some((account) => account.nim === candidate)) {
      return candidate;
    }
  }
  return String(Date.now()).slice(-10);
}

function toUser(account: StoredAccount): AuthUser {
  return {
    role: account.role || "student",
    nim: account.nim,
    fullName: account.fullName,
    gender: account.gender,
    faculty: account.faculty,
    department: account.department,
    email: account.email,
    phone: account.phone,
  };
}

function normalizeStoredAccount(account: Partial<StoredAccount>): StoredAccount {
  return {
    role: normalizeRole(account.role),
    nim: account.nim || "",
    password: account.password || "",
    fullName: account.fullName || "",
    gender: account.gender,
    faculty: account.faculty,
    department: account.department,
    email: account.email,
    phone: account.phone,
  };
}

function normalizeSessionUser(user: Partial<AuthUser>): AuthUser {
  return {
    role: normalizeRole(user.role),
    nim: user.nim || "",
    fullName: user.fullName || "",
    gender: user.gender,
    faculty: user.faculty,
    department: user.department,
    email: user.email,
    phone: user.phone,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<StoredAccount[]>(DUMMY_ACCOUNTS);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const storedAccountsRaw = localStorage.getItem(ACCOUNTS_KEY);
      const storedAccounts: StoredAccount[] = storedAccountsRaw
        ? (JSON.parse(storedAccountsRaw) as Partial<StoredAccount>[]).map(
            normalizeStoredAccount
          )
        : DUMMY_ACCOUNTS;
      const mergedAccounts = [...storedAccounts];
      for (const dummy of DUMMY_ACCOUNTS) {
        const existingIndex = mergedAccounts.findIndex(
          (account) => account.nim === dummy.nim
        );
        if (existingIndex === -1) {
          mergedAccounts.push(dummy);
          continue;
        }
        mergedAccounts[existingIndex] = {
          ...dummy,
          password: mergedAccounts[existingIndex].password || dummy.password,
        };
      }
      setAccounts(mergedAccounts);

      const storedSessionRaw = localStorage.getItem(SESSION_KEY);
      const storedSession: AuthUser | null = storedSessionRaw
        ? normalizeSessionUser(JSON.parse(storedSessionRaw) as Partial<AuthUser>)
        : null;
      const matchedSessionAccount = storedSession
        ? mergedAccounts.find((account) => account.nim === storedSession.nim)
        : null;
      setUser(matchedSessionAccount ? toUser(matchedSessionAccount) : storedSession);

      const shouldPersistMergedAccounts =
        !storedAccountsRaw ||
        JSON.stringify(mergedAccounts) !== JSON.stringify(storedAccounts);
      if (shouldPersistMergedAccounts) {
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(mergedAccounts));
      }
    } catch {
      setAccounts(DUMMY_ACCOUNTS);
      setUser(null);
    } finally {
      setIsReady(true);
    }
  }, []);

  const persistAccounts = useCallback((nextAccounts: StoredAccount[]) => {
    setAccounts(nextAccounts);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts));
  }, []);

  const persistSession = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
    if (!nextUser) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
  }, []);

  const canLoginWithCredential = useCallback(
    (identifier: string, password: string) => {
      const normalizedIdentifier = normalizeIdentifier(identifier);
      const emailIdentifier = normalizedIdentifier.toLowerCase();
      return accounts.some((account) => {
        if (account.password !== password) return false;
        if (account.nim === normalizedIdentifier) return true;
        return normalizeEmail(account.email) === emailIdentifier;
      });
    },
    [accounts]
  );

  const login = useCallback(
    (identifier: string, password: string): AuthResult => {
      const normalizedIdentifier = normalizeIdentifier(identifier);
      const emailIdentifier = normalizedIdentifier.toLowerCase();
      const matched = accounts.find(
        (account) =>
          account.password === password &&
          (account.nim === normalizedIdentifier ||
            normalizeEmail(account.email) === emailIdentifier)
      );

      if (!matched) {
        return { ok: false, message: "NIM/email atau password tidak ditemukan." };
      }

      const nextUser = toUser(matched);
      persistSession(nextUser);
      return { ok: true, user: nextUser };
    },
    [accounts, persistSession]
  );

  const isNimAvailable = useCallback(
    (nim: string) => !accounts.some((account) => account.nim === nim),
    [accounts]
  );

  const register = useCallback(
    (payload: RegisterPayload): AuthResult => {
      const isNimUsed = accounts.some((account) => account.nim === payload.nim);
      if (isNimUsed) {
        return { ok: false, message: "NIM sudah terdaftar. Gunakan login." };
      }

      const newAccount: StoredAccount = {
        role: "student",
        ...payload,
        password: payload.nim,
      };
      const nextAccounts = [newAccount, ...accounts];
      persistAccounts(nextAccounts);

      const nextUser = toUser(newAccount);
      persistSession(nextUser);
      return {
        ok: true,
        user: nextUser,
        message: "Akun berhasil dibuat. Password awal sama dengan NIM.",
      };
    },
    [accounts, persistAccounts, persistSession]
  );

  const createAdmin = useCallback(
    (payload: CreateAdminPayload): AuthResult => {
      const email = normalizeEmail(payload.email);
      const password = payload.password.trim();

      if (!emailRegex.test(email)) {
        return { ok: false, message: "Format email admin belum valid." };
      }

      if (password.length < 8) {
        return { ok: false, message: "Password admin minimal 8 karakter." };
      }

      const isEmailUsed = accounts.some(
        (account) => normalizeEmail(account.email) === email
      );
      if (isEmailUsed) {
        return { ok: false, message: "Email admin sudah terdaftar." };
      }

      const newAccount: StoredAccount = {
        role: "admin",
        nim: generateAdminNim(accounts),
        fullName: formatNameFromEmail(email),
        password,
        email,
        faculty: "Direktorat Kemahasiswaan",
        department: "Subdirektorat Konseling",
      };

      persistAccounts([newAccount, ...accounts]);
      return {
        ok: true,
        user: toUser(newAccount),
        message: "Admin baru berhasil ditambahkan.",
      };
    },
    [accounts, persistAccounts]
  );

  const adminAccounts = useMemo(
    () => accounts.filter((account) => isAdminRole(account.role)).map(toUser),
    [accounts]
  );

  const logout = useCallback(() => {
    persistSession(null);
  }, [persistSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      adminAccounts,
      demoCredentials: {
        nim: DUMMY_ACCOUNTS[0].nim,
        password: DUMMY_ACCOUNTS[0].password,
      },
      adminDemoCredentials: {
        nim: DEMO_ADMIN_ACCOUNT.nim,
        password: DEMO_ADMIN_ACCOUNT.password,
      },
      login,
      register,
      createAdmin,
      canLoginWithCredential,
      isNimAvailable,
      logout,
    }),
    [
      adminAccounts,
      canLoginWithCredential,
      createAdmin,
      isNimAvailable,
      isReady,
      login,
      logout,
      register,
      user,
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
