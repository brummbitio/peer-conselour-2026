"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { isAdminRole, useAuth } from "../../auth/auth-provider";
import { useAdminDashboardData } from "./hooks/useAdminDashboardData";
import type { AdminTab } from "./types";
import "../../styles/admin-dashboard.css";
import "../../styles/account-ticket.css";

// Tab loader component
const TabLoader = () => (
  <div style={{ padding: "80px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
    <div className="loader-progress-bar" style={{ width: "120px" }}>
      <div className="loader-progress-fill" />
    </div>
    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>
      Memuat Konten...
    </span>
  </div>
);

// Lazy load tab components
const AdminDashboardTab = dynamic(() => import("./components/AdminDashboardTab").then(mod => mod.AdminDashboardTab), {
  loading: () => <TabLoader />,
  ssr: false,
});
const AdminSchedulesTab = dynamic(() => import("./components/AdminSchedulesTab").then(mod => mod.AdminSchedulesTab), {
  loading: () => <TabLoader />,
  ssr: false,
});
const AdminTicketsTab = dynamic(() => import("./components/AdminTicketsTab").then(mod => mod.AdminTicketsTab), {
  loading: () => <TabLoader />,
  ssr: false,
});
const AdminStudentsTab = dynamic(() => import("./components/AdminStudentsTab").then(mod => mod.AdminStudentsTab), {
  loading: () => <TabLoader />,
  ssr: false,
});
const AdminAdminsTab = dynamic(() => import("./components/AdminAdminsTab").then(mod => mod.AdminAdminsTab), {
  loading: () => <TabLoader />,
  ssr: false,
});
const AdminProfileTab = dynamic(() => import("./components/AdminProfileTab").then(mod => mod.AdminProfileTab), {
  loading: () => <TabLoader />,
  ssr: false,
});




export default function AdminDashboardClient() {
  const { user, isReady, adminAccounts, createAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = (searchParams.get("tab") as AdminTab) || "dashboard";

  const setTab = useCallback(
    (nextTab: AdminTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, searchParams, router]
  );

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch admin dashboard data using custom hook
  const {
    adminStats,
    adminTickets,
    adminStudents,
    liveSchedules,
    isLoading,
    refetch,
  } = useAdminDashboardData(user);

  const isSuperadmin = user?.role === "superadmin";

  useEffect(() => {
    if (isReady && (!user || !isAdminRole(user.role))) {
      router.replace("/my-counseling");
    }
  }, [isReady, user, router]);

  if (!isMounted || !isReady || !user || !isAdminRole(user.role)) {
    return (
      <section className="section site-width account-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "450px", gap: "20px" }}>
        <div className="loader-progress-bar" style={{ width: "140px" }}>
          <div className="loader-progress-fill" />
        </div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>
          Memverifikasi Sesi...
        </span>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="section site-width account-page">
        <div style={{ textAlign: "center", padding: "120px 0", color: "#fff" }}>
          <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>Memuat dashboard admin...</p>
          <span style={{ fontSize: "0.9rem", opacity: 0.6 }}>Menghubungkan ke server lokal...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="section site-width account-page">
      <div className="my-counseling-layout">
        <aside className="my-counseling-tabs admin-sidebar">
          <button
            type="button"
            className={tab === "dashboard" ? "is-active" : ""}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={tab === "schedules" ? "is-active" : ""}
            onClick={() => setTab("schedules")}
          >
            Jadwal Konseling
          </button>
          <button
            type="button"
            className={tab === "tickets" ? "is-active" : ""}
            onClick={() => setTab("tickets")}
          >
            Daftar Tiket
          </button>
          <button
            type="button"
            className={tab === "students" ? "is-active" : ""}
            onClick={() => setTab("students")}
          >
            Daftar Mahasiswa
          </button>
          {isSuperadmin ? (
            <button
              type="button"
              className={tab === "admins" ? "is-active" : ""}
              onClick={() => setTab("admins")}
            >
              Daftar Admin
            </button>
          ) : null}
          <button
            type="button"
            className={tab === "profile" ? "is-active" : ""}
            onClick={() => setTab("profile")}
          >
            Profil Saya
          </button>
        </aside>

        <div
          className={`my-counseling-list admin-dashboard-main ${
            tab === "schedules" ? "admin-dashboard-main-schedule" : ""
          }`}
        >
          {tab === "dashboard" ? (
            <AdminDashboardTab adminStats={adminStats} />
          ) : tab === "schedules" ? (
            <AdminSchedulesTab
              liveSchedules={liveSchedules}
              adminAccounts={adminAccounts}
              adminStudents={adminStudents}
              refetchSchedules={refetch}
            />
          ) : tab === "tickets" ? (
            <AdminTicketsTab
              adminTickets={adminTickets}
              adminStudents={adminStudents}
            />
          ) : tab === "students" ? (
            <AdminStudentsTab adminStudents={adminStudents} />
          ) : tab === "admins" && isSuperadmin ? (
            <AdminAdminsTab
              adminAccounts={adminAccounts}
              isSuperadmin={isSuperadmin}
              createAdmin={createAdmin}
            />
          ) : (
            <AdminProfileTab
              user={user}
              adminStats={adminStats}
              adminStudents={adminStudents}
            />
          )}
        </div>
      </div>
    </section>
  );
}
