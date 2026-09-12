"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/utils/api";
import { isAdminRole } from "../../../auth/auth-provider";
import type { AuthUser } from "../../../auth/auth-provider";
import { createMemoryCache } from "../../../_portal/dataCache";
import type { ApiTicket, ApiUserSummary } from "../../../_portal/types";
import type { AdminScheduleApiItem } from "../scheduleBoard";
import type { AdminStats } from "../types";

export type AdminDataFetchOptions = {
  /**
   * Paksa mode tampil/senyap. Default: pemuatan pertama memakai layar loading,
   * semua pengambilan berikutnya berjalan senyap di latar.
   */
  silent?: boolean;
};

type AdminDashboardSnapshot = {
  adminStats: AdminStats | null;
  adminTickets: ApiTicket[];
  adminStudents: ApiUserSummary[];
  liveSchedules: AdminScheduleApiItem[];
};

// Snapshot terakhir disimpan di memori tab (stale-while-revalidate): kembali
// dari detail tiket/mahasiswa/admin ke dashboard langsung menampilkan data
// tanpa layar loading, sementara data terbaru disinkronkan senyap di latar.
const dashboardCache = createMemoryCache<AdminDashboardSnapshot>();

function getCacheKey(user: AuthUser | null) {
  return user && isAdminRole(user.role) ? `${user.role}:${user.email ?? user.nim}` : null;
}

export function useAdminDashboardData(user: AuthUser | null) {
  const cacheKey = getCacheKey(user);
  const [initialSnapshot] = useState(() => (cacheKey ? dashboardCache.get(cacheKey) : null));

  const [adminStats, setAdminStats] = useState<AdminStats | null>(initialSnapshot?.adminStats ?? null);
  const [adminTickets, setAdminTickets] = useState<ApiTicket[]>(initialSnapshot?.adminTickets ?? []);
  const [adminStudents, setAdminStudents] = useState<ApiUserSummary[]>(initialSnapshot?.adminStudents ?? []);
  const [liveSchedules, setLiveSchedules] = useState<AdminScheduleApiItem[]>(initialSnapshot?.liveSchedules ?? []);

  // `isLoading` khusus pemuatan pertama (boleh menutup layar).
  // Sinkronisasi berikutnya hanya menyalakan `isRefreshing` supaya dashboard
  // tidak pernah di-unmount di tengah interaksi seperti drag & drop kanban.
  const [isLoading, setIsLoading] = useState(!initialSnapshot);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(!!initialSnapshot);

  const hasLoadedRef = useRef(!!initialSnapshot);
  const cacheKeyRef = useRef(cacheKey);
  // Nomor urut request: respons yang datang terlambat (mendahului request yang
  // lebih baru) diabaikan, jadi data basi tidak pernah menimpa data terbaru.
  const requestSeqRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const applySnapshot = useCallback((snapshot: AdminDashboardSnapshot) => {
    setAdminStats(snapshot.adminStats);
    setAdminTickets(snapshot.adminTickets);
    setLiveSchedules(snapshot.liveSchedules);
    setAdminStudents(snapshot.adminStudents);
    hasLoadedRef.current = true;
    setHasLoaded(true);
  }, []);

  const fetchAdminData = useCallback(
    async (options?: AdminDataFetchOptions) => {
      // Dipanggil juga sebagai callback tanpa argumen (`onSuccess`), jadi jangan
      // pernah mengandalkan bentuk argumen — default-nya aman.
      const silent = options?.silent ?? hasLoadedRef.current;
      const seq = ++requestSeqRef.current;
      const requestCacheKey = cacheKeyRef.current;

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [statsData, ticketsData, schedulesData, studentsData] = await Promise.all([
          api.get("/api/admin/stats"),
          api.get("/api/admin/tickets?status=&search=&counselor_id=&student_id="),
          api.get("/api/admin/schedules"),
          api.get("/api/admin/students"),
        ]);

        if (!isMountedRef.current || seq !== requestSeqRef.current) return;

        const snapshot: AdminDashboardSnapshot = {
          adminStats: statsData ?? null,
          adminTickets: Array.isArray(ticketsData) ? ticketsData : [],
          liveSchedules: Array.isArray(schedulesData) ? schedulesData : [],
          adminStudents: Array.isArray(studentsData) ? studentsData : [],
        };
        applySnapshot(snapshot);
        if (requestCacheKey) dashboardCache.set(requestCacheKey, snapshot);
      } catch (err) {
        if (!isMountedRef.current || seq !== requestSeqRef.current) return;
        console.error("Gagal mengambil data admin dari API:", err);
      } finally {
        if (isMountedRef.current && seq === requestSeqRef.current) {
          if (silent) {
            setIsRefreshing(false);
          } else {
            setIsLoading(false);
          }
        }
      }
    },
    [applySnapshot]
  );

  // Bergantung pada identitas user (string), bukan objek user, supaya perubahan
  // referensi objek dari context tidak memicu pengambilan ulang data besar.
  useEffect(() => {
    if (!cacheKey) return;
    cacheKeyRef.current = cacheKey;

    // Auth baru siap setelah mount: pakai snapshot cache (bila ada) sebelum refetch senyap.
    if (!hasLoadedRef.current) {
      const cached = dashboardCache.get(cacheKey);
      if (cached) {
        applySnapshot(cached);
        setIsLoading(false);
      }
    }

    void fetchAdminData();
  }, [cacheKey, fetchAdminData, applySnapshot]);

  return {
    adminStats,
    setAdminStats,
    adminTickets,
    setAdminTickets,
    adminStudents,
    setAdminStudents,
    liveSchedules,
    setLiveSchedules,
    /** Hanya true selama pemuatan pertama. */
    isLoading: isLoading && !hasLoaded,
    isRefreshing,
    refetch: fetchAdminData,
  };
}
