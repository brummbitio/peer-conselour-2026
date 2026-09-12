"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { isAdminRole, useAuth } from "../../auth/auth-provider";
import { PortalLoader } from "../../_portal/PortalLoader";
import { useAdminDashboardData } from "./hooks/useAdminDashboardData";
import type { AdminTab } from "./types";
import "../../styles/admin-dashboard.css";
import "../../styles/account-ticket.css";

// Tab loader component
const TabLoader = () => <PortalLoader variant="inline" label="Memuat Konten..." />;

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

// Chunk semua tab dipanaskan saat browser idle, jadi perpindahan tab pertama
// kali pun tidak menunggu unduhan JavaScript.
function preloadTabChunks(includeAdminsTab: boolean) {
  void import("./components/AdminDashboardTab");
  void import("./components/AdminSchedulesTab");
  void import("./components/AdminTicketsTab");
  void import("./components/AdminStudentsTab");
  void import("./components/AdminProfileTab");
  if (includeAdminsTab) void import("./components/AdminAdminsTab");
}

const ADMIN_TABS: readonly AdminTab[] = ["dashboard", "schedules", "tickets", "students", "admins", "profile"];

const isAdminTab = (value: string | null): value is AdminTab =>
  value !== null && (ADMIN_TABS as readonly string[]).includes(value);

export default function AdminDashboardClient() {
  const { user, isReady, adminAccounts, createAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const urlTab: AdminTab = isAdminTab(tabParam) ? tabParam : "dashboard";
  // Tab yang baru diklik ditampilkan seketika, tanpa menunggu URL tersinkron.
  const [pendingTab, setPendingTab] = useState<AdminTab | null>(null);
  const tab = pendingTab ?? urlTab;
  // Sidebar langsung berpindah, sedangkan konten tab dirender dengan prioritas
  // rendah: tab lama tetap tampil sampai tab baru siap (tanpa kedip loader).
  const contentTab = useDeferredValue(tab);

  useEffect(() => {
    if (pendingTab !== null && urlTab === pendingTab) setPendingTab(null);
  }, [urlTab, pendingTab]);

  const setTab = useCallback(
    (nextTab: AdminTab) => {
      setPendingTab(nextTab);
      const params = new URLSearchParams(window.location.search);
      params.set("tab", nextTab);
      // history.replaceState tersinkron dengan useSearchParams (Next.js >= 14.1)
      // tanpa round-trip RSC ke server seperti router.replace, jadi tidak ada jeda jaringan.
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    },
    [pathname]
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
    isRefreshing,
    refetch,
  } = useAdminDashboardData(user);

  const isSuperadmin = user?.role === "superadmin";

  useEffect(() => {
    if (!isMounted || isLoading) return;
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => preloadTabChunks(isSuperadmin), { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = window.setTimeout(() => preloadTabChunks(isSuperadmin), 600);
    return () => window.clearTimeout(timer);
  }, [isMounted, isLoading, isSuperadmin]);

  // Di tablet/mobile sidebar berubah jadi tab bar horizontal yang bisa digeser.
  // Geser tab aktif ke tengah supaya tidak tersembunyi di luar layar (mis. saat
  // dibuka lewat ?tab=profile). Di desktop sidebar vertikal tidak pernah
  // overflow ke samping, jadi efek ini langsung berhenti.
  const sidebarRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar || sidebar.scrollWidth <= sidebar.clientWidth) return;
    const activeTab = sidebar.querySelector<HTMLElement>("button.is-active");
    if (!activeTab) return;
    const sidebarRect = sidebar.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    sidebar.scrollTo({
      left:
        sidebar.scrollLeft +
        tabRect.left -
        sidebarRect.left -
        (sidebarRect.width - tabRect.width) / 2,
      behavior: "smooth",
    });
  }, [tab, isMounted, isReady, isLoading]);

  useEffect(() => {
    if (isReady && (!user || !isAdminRole(user.role))) {
      router.replace("/my-counseling");
    }
  }, [isReady, user, router]);

  if (!isMounted || !isReady || !user || !isAdminRole(user.role)) {
    return <PortalLoader label="Memverifikasi Sesi..." />;
  }

  // Hanya pemuatan PERTAMA yang boleh menutup layar. Sinkronisasi latar
  // (mis. setelah drag & drop kanban) tidak boleh me-unmount pohon ini —
  // unmount di tengah interaksi itulah penyebab layar berkedip sekaligus
  // matinya event drag & drop.
  if (isLoading) {
    return <PortalLoader label="Memuat dashboard admin..." />;
  }

  const sidebarTabs: { id: AdminTab; label: string; visible: boolean }[] = [
    { id: "dashboard", label: "Dashboard", visible: true },
    { id: "schedules", label: "Jadwal Konseling", visible: true },
    { id: "tickets", label: "Daftar Tiket", visible: true },
    { id: "students", label: "Daftar Mahasiswa", visible: true },
    { id: "admins", label: "Daftar Admin", visible: isSuperadmin },
    { id: "profile", label: "Profil Saya", visible: true },
  ];

  return (
    <section className="section site-width account-page" data-refreshing={isRefreshing ? "true" : undefined}>
      <div className="my-counseling-layout admin-layout">
        <aside ref={sidebarRef} className="my-counseling-tabs admin-sidebar" aria-label="Menu dashboard admin">
          {sidebarTabs
            .filter((item) => item.visible)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? "is-active" : ""}
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
        </aside>

        <div
          className={`my-counseling-list admin-dashboard-main ${
            contentTab === "schedules" ? "admin-dashboard-main-schedule" : ""
          }`}
        >
          {contentTab === "dashboard" ? (
            <AdminDashboardTab adminStats={adminStats} />
          ) : contentTab === "schedules" ? (
            <AdminSchedulesTab
              liveSchedules={liveSchedules}
              adminAccounts={adminAccounts}
              adminStudents={adminStudents}
              refetchSchedules={refetch}
            />
          ) : contentTab === "tickets" ? (
            <AdminTicketsTab
              adminTickets={adminTickets}
              adminStudents={adminStudents}
            />
          ) : contentTab === "students" ? (
            <AdminStudentsTab adminStudents={adminStudents} />
          ) : contentTab === "admins" && isSuperadmin ? (
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
