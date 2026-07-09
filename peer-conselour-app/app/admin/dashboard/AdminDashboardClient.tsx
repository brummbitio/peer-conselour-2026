"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  PanelsTopLeft,
  Plus,
  SlidersHorizontal,
  Shrink,
  Expand,
  Users,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { isAdminRole, useAuth } from "../../auth/auth-provider";
import type { AuthUser } from "../../auth/auth-provider";
import { ticketStatusLabel } from "../../tickets/mock-data";
import type { TicketStatus } from "../../tickets/mock-data";
import { api } from "@/utils/api";
import { DateTimePanel } from "@/components/application/date-picker/date-time-panel";
import { ScheduleCalendar } from "./ScheduleCalendar";

type AdminTab =
  | "dashboard"
  | "schedules"
  | "tickets"
  | "students"
  | "admins"
  | "profile";
type TrendRange = "day" | "month" | "year";
type TicketFilter = "all" | TicketStatus;
type CounselingScheduleStatus =
  | "pending_confirmation"
  | "scheduled"
  | "reschedule"
  | "cancelled"
  | "completed";

type CounselingScheduleItem = {
  id: string;
  clientName: string;
  dateValue: string;
  timeValue: string;
  handlerName: string;
  serviceType: "tatap_muka" | "online";
};

type CounselingScheduleColumn = {
  id: CounselingScheduleStatus;
  title: string;
  description: string;
  items: CounselingScheduleItem[];
};

type ScheduleOverlayKind = "datetime" | "handler" | "service";

type ScheduleOverlayState = {
  cardId: string;
  kind: ScheduleOverlayKind;
  top: number;
  left: number;
  maxHeight: number;
};

type AddScheduleMenu = "client" | "datetime" | "handler" | "service" | null;

const trendSeries: Record<
  TrendRange,
  { title: string; labels: string[]; values: number[] }
> = {
  day: {
    title: "Per Hari",
    labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
    values: [3, 5, 4, 6, 5, 7, 4],
  },
  month: {
    title: "Per Bulan",
    labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt"],
    values: [24, 29, 31, 27, 35, 33, 30, 37],
  },
  year: {
    title: "Per Tahun",
    labels: ["2021", "2022", "2023", "2024", "2025", "2026"],
    values: [188, 214, 263, 298, 327, 341],
  },
};

const counselingScheduleColumns: CounselingScheduleColumn[] = [
  {
    id: "pending_confirmation",
    title: "Menunggu Konfirmasi",
    description: "Perlu persetujuan jadwal dari klien.",
    items: [
      {
        id: "SCL-201",
        clientName: "Nadya Putri",
        dateValue: "2026-04-27",
        timeValue: "09:00",
        handlerName: "Fathur Rahman",
        serviceType: "tatap_muka",
      },
      {
        id: "SCL-202",
        clientName: "Rafi Kurniawan",
        dateValue: "2026-04-27",
        timeValue: "13:00",
        handlerName: "Alya Safitri",
        serviceType: "online",
      },
      {
        id: "SCL-203",
        clientName: "Sarah Azzahra",
        dateValue: "2026-04-28",
        timeValue: "10:30",
        handlerName: "Nabil Hidayat",
        serviceType: "tatap_muka",
      },
    ],
  },
  {
    id: "scheduled",
    title: "Terjadwalkan",
    description: "Sesi sudah terkonfirmasi dan siap berjalan.",
    items: [
      {
        id: "SCL-204",
        clientName: "Kevin Mahendra",
        dateValue: "2026-04-29",
        timeValue: "08:30",
        handlerName: "Rafa Pratama",
        serviceType: "online",
      },
      {
        id: "SCL-205",
        clientName: "Salsabila N.",
        dateValue: "2026-04-29",
        timeValue: "14:00",
        handlerName: "Fathur Rahman",
        serviceType: "tatap_muka",
      },
      {
        id: "SCL-206",
        clientName: "Daniel Wijaya",
        dateValue: "2026-04-30",
        timeValue: "11:00",
        handlerName: "Alya Safitri",
        serviceType: "online",
      },
      {
        id: "SCL-207",
        clientName: "Ayu Cintya",
        dateValue: "2026-04-30",
        timeValue: "15:30",
        handlerName: "Nabil Hidayat",
        serviceType: "tatap_muka",
      },
    ],
  },
  {
    id: "reschedule",
    title: "Reschedule",
    description: "Ada perubahan waktu, menunggu slot baru.",
    items: [
      {
        id: "SCL-208",
        clientName: "Farhan Iskandar",
        dateValue: "2026-05-01",
        timeValue: "09:30",
        handlerName: "Rafa Pratama",
        serviceType: "tatap_muka",
      },
      {
        id: "SCL-209",
        clientName: "Mira Lestari",
        dateValue: "2026-05-01",
        timeValue: "13:30",
        handlerName: "Alya Safitri",
        serviceType: "online",
      },
    ],
  },
  {
    id: "completed",
    title: "Selesai",
    description: "Sesi konseling telah selesai dilaksanakan.",
    items: [],
  },
  {
    id: "cancelled",
    title: "Batal",
    description: "Sesi dibatalkan oleh klien atau admin.",
    items: [
      {
        id: "SCL-210",
        clientName: "Bintang Saputra",
        dateValue: "2026-04-28",
        timeValue: "16:00",
        handlerName: "Nabil Hidayat",
        serviceType: "online",
      },
    ],
  },
];

const scheduleWeekdayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const scheduleMonthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const formatScheduleDateLabel = (dateValue: string) => {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  const weekday = scheduleWeekdayLabels[date.getDay()] ?? "";
  const monthLabel = scheduleMonthLabels[date.getMonth()] ?? "";
  return `${weekday}, ${date.getDate()} ${monthLabel} ${date.getFullYear()}`;
};

const formatSingleTime = (timeValue: string) => {
  if (!/^\d{2}:\d{2}$/.test(timeValue)) return "Set time";
  const [hour, minute] = timeValue.split(":").map(Number);
  const period = (hour ?? 0) >= 12 ? "PM" : "AM";
  const normalizedHour = (hour ?? 0) % 12 === 0 ? 12 : (hour ?? 0) % 12;
  return `${normalizedHour}:${`${minute ?? 0}`.padStart(2, "0")} ${period}`;
};

const formatScheduleTimeDisplay = (timeValue: string) => {
  if (timeValue.includes("-")) {
    const [start, end] = timeValue.split("-").map(t => t.trim());
    return `${formatSingleTime(start)} - ${formatSingleTime(end)}`;
  }
  return formatSingleTime(timeValue);
};

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const end = value;
    
    if (end === 0) {
      setCount(0);
      return;
    }

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const easedProgress = progress * (2 - progress);
      setCount(Math.round(easedProgress * end));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return <>{count.toLocaleString("id-ID")}</>;
}

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
  const [scheduleViewMode, setScheduleViewMode] = useState<"kanban" | "calendar">("kanban");
  const [trendRange, setTrendRange] = useState<TrendRange>("day");
  const [ticketQuery, setTicketQuery] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [adminQuery, setAdminQuery] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<AuthRole>("admin");
  const [adminFormMessage, setAdminFormMessage] = useState("");
  const [adminFormError, setAdminFormError] = useState("");
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [addScheduleClientId, setAddScheduleClientId] = useState("");
  const [scheduleClientSearchQuery, setScheduleClientSearchQuery] = useState("");
  const [scheduleHandlerSearchQuery, setScheduleHandlerSearchQuery] = useState("");
  const [addScheduleDateValue, setAddScheduleDateValue] = useState("2026-04-27");
  const [addScheduleTimeValue, setAddScheduleTimeValue] = useState("09:00");
  const [addScheduleHandlerName, setAddScheduleHandlerName] = useState("");
  const [addScheduleServiceType, setAddScheduleServiceType] =
    useState<CounselingScheduleItem["serviceType"]>("tatap_muka");
  const [activeAddScheduleMenu, setActiveAddScheduleMenu] =
    useState<AddScheduleMenu>(null);
  const [addScheduleError, setAddScheduleError] = useState("");
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("all");
  const [ticketPage, setTicketPage] = useState(1);
  const ticketsPerPage = 10;
  const [studentPage, setStudentPage] = useState(1);
  const studentsPerPage = 10;
  const [adminPage, setAdminPage] = useState(1);
  const adminsPerPage = 10;

  // Live API States
  const [adminStats, setAdminStats] = useState<any | null>(null);
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [adminStudents, setAdminStudents] = useState<any[]>([]);
  const [liveSchedules, setLiveSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [scheduleColumns, setScheduleColumns] = useState<CounselingScheduleColumn[]>([
    { id: "pending_confirmation", title: "Konfirmasi", description: "Menunggu persetujuan", items: [] },
    { id: "scheduled", title: "Terjadwal", description: "Sesi konseling disepakati", items: [] },
    { id: "reschedule", title: "Reschedule", description: "Permintaan atur ulang waktu", items: [] },
    { id: "cancelled", title: "Dibatalkan", description: "Sesi konseling batal", items: [] },
    { id: "completed", title: "Selesai", description: "Sesi konseling telah usai", items: [] },
  ]);
  
  const [activeScheduleOverlay, setActiveScheduleOverlay] =
    useState<ScheduleOverlayState | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<CounselingScheduleStatus[]>([]);
  const scheduleOverlayRef = useRef<HTMLDivElement | null>(null);
  const adminName = user?.fullName ?? "";
  const isSuperadmin = user?.role === "superadmin";

  const fetchAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsData, ticketsData, schedulesData, studentsData] = await Promise.all([
        api.get("/api/admin/stats"),
        api.get("/api/admin/tickets?status=&search=&counselor_id=&student_id="),
        api.get("/api/admin/schedules"),
        api.get("/api/admin/students")
      ]);
      setAdminStats(statsData);
      setAdminTickets(ticketsData);
      setLiveSchedules(schedulesData);
      setAdminStudents(studentsData);
    } catch (err) {
      console.error("Gagal mengambil data admin dari API:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdminRole(user.role)) {
      fetchAdminData();
    }
  }, [user, fetchAdminData]);

  // Map live schedules to kanban columns
  useEffect(() => {
    const columns: Record<CounselingScheduleStatus, CounselingScheduleColumn> = {
      pending_confirmation: { id: "pending_confirmation", title: "Konfirmasi", description: "Menunggu persetujuan", items: [] },
      scheduled: { id: "scheduled", title: "Terjadwal", description: "Sesi konseling disepakati", items: [] },
      reschedule: { id: "reschedule", title: "Reschedule", description: "Permintaan atur ulang waktu", items: [] },
      cancelled: { id: "cancelled", title: "Dibatalkan", description: "Sesi konseling batal", items: [] },
      completed: { id: "completed", title: "Selesai", description: "Sesi konseling telah usai", items: [] },
    };

    for (const item of liveSchedules) {
      const statusKey = item.status as CounselingScheduleStatus;
      if (columns[statusKey]) {
        columns[statusKey].items.push({
          id: String(item.id),
          clientName: item.client_name,
          dateValue: item.date_value ? item.date_value.split("T")[0] : "",
          timeValue: item.time_value,
          handlerName: item.handler ? item.handler.full_name : "Belum Ditugaskan",
          serviceType: item.service_type,
        });
      }
    }

    setScheduleColumns(Object.values(columns));
  }, [liveSchedules]);

  const toggleColumnCollapse = (columnId: CounselingScheduleStatus) => {
    setCollapsedColumns((prev) =>
      prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]
    );
  };

  const statusCountsMap = useMemo(() => {
    const map: Record<string, number> = { open: 0, in_progress: 0, resolved: 0 };
    if (adminStats?.status_counts && Array.isArray(adminStats.status_counts)) {
      adminStats.status_counts.forEach((item: any) => {
        map[item.status] = item.count || 0;
      });
    }
    return map;
  }, [adminStats]);

  const waitingCount = statusCountsMap.open;
  const repliedCount = statusCountsMap.in_progress;
  const doneCount = statusCountsMap.resolved;
  const totalCount = adminStats?.total_tickets || 0;

  const topicStats = useMemo(() => {
    if (!adminStats || !adminStats.category_counts || !Array.isArray(adminStats.category_counts)) return [];
    return adminStats.category_counts
      .map((item: any) => ({
        topic: item.category || "Lainnya",
        value: Number(item.count || 0),
      }))
      .sort((a, b) => b.value - a.value);
  }, [adminStats]);

  // Find tickets assigned to current counselor (NIM is mapped as String(id) for admins)
  const firstReplyTicketsForAdmin = useMemo(() => {
    if (!user) return [];
    return adminTickets.filter(
      (ticket) => String(ticket.counselor_id) === String(user.nim)
    );
  }, [adminTickets, user]);

  const activeTrend = trendSeries[trendRange];
  const chartData = useMemo(
    () =>
      activeTrend.labels.map((label, index) => ({
        label,
        value: activeTrend.values[index],
      })),
    [activeTrend]
  );
  const filteredTickets = useMemo(() => {
    const query = ticketQuery.trim().toLowerCase();
    const filtered = adminTickets.filter((ticket) => {
      const statusMatch = ticketFilter === "all" || ticket.status === ticketFilter;
      const queryMatch =
        !query ||
        ticket.title.toLowerCase().includes(query) ||
        ticket.code.toLowerCase().includes(query) ||
        ticket.category.toLowerCase().includes(query);
      return statusMatch && queryMatch;
    });
    return filtered;
  }, [ticketQuery, ticketFilter, adminTickets]);

  const paginatedTickets = useMemo(() => {
    const start = (ticketPage - 1) * ticketsPerPage;
    return filteredTickets.slice(start, start + ticketsPerPage);
  }, [filteredTickets, ticketPage]);

  // Reset page when filter/query changes
  useEffect(() => {
    setTicketPage(1);
  }, [ticketQuery, ticketFilter]);

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    const filtered = adminStudents.filter(
      (student) =>
        (student.full_name || student.fullName || "").toLowerCase().includes(query) ||
        (student.nim || "").toLowerCase().includes(query)
    );
    return filtered;
  }, [studentQuery, adminStudents]);

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * studentsPerPage;
    return filteredStudents.slice(start, start + studentsPerPage);
  }, [filteredStudents, studentPage]);

  // Reset student page on search
  useEffect(() => {
    setStudentPage(1);
  }, [studentQuery]);
  
  const studentNameById = useMemo(
    () =>
      adminStudents.reduce<Record<string, string>>((acc, student) => {
        acc[student.id] = student.full_name || student.fullName;
        return acc;
      }, {}),
    [adminStudents]
  );
  const filteredAdminAccounts = useMemo(() => {
    const query = adminQuery.trim().toLowerCase();
    const filtered = adminAccounts.filter((account) => {
      const email = account.email?.toLowerCase() ?? "";
      return (
        account.fullName.toLowerCase().includes(query) ||
        email.includes(query) ||
        account.nim.includes(query)
      );
    });
    return filtered;
  }, [adminAccounts, adminQuery]);

  const paginatedAdminAccounts = useMemo(() => {
    const start = (adminPage - 1) * adminsPerPage;
    return filteredAdminAccounts.slice(start, start + adminsPerPage);
  }, [filteredAdminAccounts, adminPage]);

  // Reset admin page on search
  useEffect(() => {
    setAdminPage(1);
  }, [adminQuery]);
  const scheduleHandlerOptions = useMemo(() => {
    const options = new Set<string>();
    adminAccounts.forEach((account) => {
      if (account.fullName) options.add(account.fullName);
    });
    scheduleColumns.forEach((column) => {
      column.items.forEach((item) => {
        if (item.handlerName) options.add(item.handlerName);
      });
    });
    return Array.from(options);
  }, [adminAccounts, scheduleColumns]);
  const scheduleClientOptions = useMemo(
    () =>
      adminStudents.map((student) => ({
        id: String(student.id),
        label: student.full_name || student.fullName,
        meta: student.nim,
      })),
    [adminStudents]
  );

  const filteredScheduleClientOptions = useMemo(() => {
    const query = scheduleClientSearchQuery.toLowerCase().trim();
    if (!query) return scheduleClientOptions;
    return scheduleClientOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        (option.meta && option.meta.toLowerCase().includes(query))
    );
  }, [scheduleClientOptions, scheduleClientSearchQuery]);

  const filteredScheduleHandlerOptions = useMemo(() => {
    const query = scheduleHandlerSearchQuery.toLowerCase().trim();
    if (!query) return scheduleHandlerOptions;
    return scheduleHandlerOptions.filter((name) =>
      name.toLowerCase().includes(query)
    );
  }, [scheduleHandlerOptions, scheduleHandlerSearchQuery]);

  useEffect(() => {
    if (!isAddAdminModalOpen && !isAddScheduleModalOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isAddAdminModalOpen, isAddScheduleModalOpen]);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace("/");
    } else if (!isAdminRole(user.role)) {
      router.replace("/my-counseling");
    }
  }, [isReady, user, router]);

  useEffect(() => {
    if (tab === "schedules") return;
    setActiveScheduleOverlay(null);
  }, [tab]);
  useEffect(() => {
    if (!isAddScheduleModalOpen) {
      setActiveAddScheduleMenu(null);
      setScheduleClientSearchQuery("");
      setScheduleHandlerSearchQuery("");
    }
  }, [isAddScheduleModalOpen]);

  useEffect(() => {
    if (activeAddScheduleMenu !== "client") {
      setScheduleClientSearchQuery("");
    }
    if (activeAddScheduleMenu !== "handler") {
      setScheduleHandlerSearchQuery("");
    }
  }, [activeAddScheduleMenu]);

  const selectTicketFilter = (nextFilter: TicketFilter) => {
    setTicketFilter(nextFilter);
  };

  const closeFilterDropdown = (event: React.MouseEvent<HTMLButtonElement>) => {
    const details = event.currentTarget.closest("details");
    if (details) {
      (details as HTMLDetailsElement).open = false;
    }
  };

  const onSelectFilter = (nextFilter: TicketFilter) => (event: React.MouseEvent<HTMLButtonElement>) => {
    selectTicketFilter(nextFilter);
    closeFilterDropdown(event);
  };

  const isFilterActive = ticketFilter !== "all";

  const filteredTicketsByQueryOnly = useMemo(() => {
    const query = ticketQuery.trim().toLowerCase();
    if (!query) return adminTickets;
    return adminTickets.filter(
      (ticket) =>
        ticket.title.toLowerCase().includes(query) ||
        ticket.code.toLowerCase().includes(query) ||
        ticket.category.toLowerCase().includes(query)
    );
  }, [ticketQuery, adminTickets]);

  const submitAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSuperadmin) return;

    if (!newAdminEmail.trim()) {
      setAdminFormError("Email admin tidak boleh kosong.");
      setAdminFormMessage("");
      return;
    }

    const result = await createAdmin({
      email: newAdminEmail,
      role: newAdminRole,
    });

    if (!result.ok) {
      setAdminFormError(result.message || "Admin belum berhasil ditambahkan.");
      setAdminFormMessage("");
      return;
    }

    setAdminFormError("");
    setAdminFormMessage(result.message || "Admin berhasil ditambahkan.");
    setNewAdminEmail("");
    setNewAdminRole("admin");
    setIsAddAdminModalOpen(false);
  };

  const openAddScheduleModal = () => {
    setAddScheduleClientId(scheduleClientOptions[0]?.id ?? "");
    setAddScheduleDateValue("2026-04-27");
    setAddScheduleTimeValue("09:00");
    setAddScheduleHandlerName(scheduleHandlerOptions[0] ?? "");
    setAddScheduleServiceType("tatap_muka");
    setAddScheduleError("");
    setActiveAddScheduleMenu(null);
    setScheduleClientSearchQuery("");
    setScheduleHandlerSearchQuery("");
    setIsAddScheduleModalOpen(true);
  };

  const submitSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedClient = scheduleClientOptions.find((option) => option.id === addScheduleClientId);
    if (!selectedClient || !addScheduleHandlerName) {
      setAddScheduleError("Lengkapi klien dan penangan terlebih dahulu.");
      return;
    }

    const matchedCounselor = adminAccounts.find(
      (acc) => acc.fullName === addScheduleHandlerName
    );
    if (!matchedCounselor) {
      setAddScheduleError("Pilih penanggung jawab yang valid.");
      return;
    }

    try {
      await api.post("/api/admin/schedules", {
        client_name: selectedClient.label,
        date_value: addScheduleDateValue,
        time_value: addScheduleTimeValue,
        handler_id: Number(matchedCounselor.nim),
        service_type: addScheduleServiceType,
      });

      const schedulesData = await api.get("/api/admin/schedules");
      setLiveSchedules(schedulesData);

      setAddScheduleError("");
      setIsAddScheduleModalOpen(false);
      setActiveAddScheduleMenu(null);
    } catch (err) {
      console.error("Gagal menambahkan jadwal:", err);
      setAddScheduleError("Gagal menambahkan jadwal ke server.");
    }
  };

  const getRoleLabel = (role: AuthUser["role"]) => {
    if (role === "superadmin") return "Superadmin";
    if (role === "admin") return "Admin";
    return "Mahasiswa";
  };

  const updateScheduleItem = async (
    cardId: string,
    updater: (item: CounselingScheduleItem) => CounselingScheduleItem
  ) => {
    let currentItem: CounselingScheduleItem | null = null;
    for (const col of scheduleColumns) {
      const found = col.items.find((it) => it.id === cardId);
      if (found) {
        currentItem = found;
        break;
      }
    }

    if (!currentItem) return;

    const nextItem = updater(currentItem);

    setScheduleColumns((previous) =>
      previous.map((column) => ({
        ...column,
        items: column.items.map((item) => (item.id === cardId ? nextItem : item)),
      }))
    );

    let handlerId: number | undefined = undefined;
    if (nextItem.handlerName && nextItem.handlerName !== "Belum Ditugaskan") {
      const matched = adminAccounts.find((acc) => acc.fullName === nextItem.handlerName);
      if (matched) {
        handlerId = Number(matched.nim);
      }
    }

    try {
      await api.put(`/api/admin/schedules/${cardId}`, {
        date_value: nextItem.dateValue,
        time_value: nextItem.timeValue,
        handler_id: handlerId,
        service_type: nextItem.serviceType,
      });
    } catch (err) {
      console.error("Gagal memperbarui jadwal di server:", err);
      const schedulesData = await api.get("/api/admin/schedules");
      setLiveSchedules(schedulesData);
    }
  };

  // ── Drag & Drop ──
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<CounselingScheduleStatus | null>(null);

  const handleDragStart = (event: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", cardId);
    // Make the drag image slightly transparent
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (event: React.DragEvent) => {
    setDraggedCardId(null);
    setDragOverColumnId(null);
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (event: React.DragEvent, columnId: CounselingScheduleStatus) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverColumnId(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumnId(null);
  };

  const handleDrop = (event: React.DragEvent, targetColumnId: CounselingScheduleStatus) => {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain");
    if (!cardId) return;

    updateScheduleItemStatus(cardId, targetColumnId);

    setDraggedCardId(null);
    setDragOverColumnId(null);
  };

  const updateScheduleItemStatus = async (cardId: string, targetColumnId: CounselingScheduleStatus) => {
    setScheduleColumns((previous) => {
      let draggedItem: CounselingScheduleItem | null = null;
      let sourceColumnId: CounselingScheduleStatus | null = null;

      for (const col of previous) {
        const found = col.items.find((item) => item.id === cardId);
        if (found) {
          draggedItem = found;
          sourceColumnId = col.id;
          break;
        }
      }

      if (!draggedItem || sourceColumnId === targetColumnId) return previous;

      return previous.map((col) => {
        if (col.id === sourceColumnId) {
          return { ...col, items: col.items.filter((item) => item.id !== cardId) };
        }
        if (col.id === targetColumnId) {
          return { ...col, items: [...col.items, draggedItem!] };
        }
        return col;
      });
    });

    try {
      await api.put(`/api/admin/schedules/${cardId}`, {
        status: targetColumnId,
      });
    } catch (err) {
      console.error("Gagal memperbarui status jadwal ke server:", err);
      // Reload on failure to sync
      const schedulesData = await api.get("/api/admin/schedules");
      setLiveSchedules(schedulesData);
    }
  };

  const openScheduleOverlay = (
    event: React.MouseEvent<HTMLButtonElement>,
    item: CounselingScheduleItem,
    kind: ScheduleOverlayKind
  ) => {
    const anchorRect = event.currentTarget.getBoundingClientRect();
    const panelWidth =
      kind === "datetime" ? 480 : kind === "handler" ? 300 : 260;
    const viewportPadding = 18;
    const calculatedLeft = Math.min(
      Math.max(viewportPadding, anchorRect.left),
      window.innerWidth - panelWidth - viewportPadding
    );
    const calculatedTop = anchorRect.bottom + 8;
    const availableHeight = Math.max(
      kind === "datetime" ? 320 : 160,
      window.innerHeight - calculatedTop - viewportPadding
    );

    setActiveScheduleOverlay({
      cardId: item.id,
      kind,
      top: calculatedTop,
      left: calculatedLeft,
      maxHeight: availableHeight,
    });
  };

  const activeScheduleCard = useMemo(() => {
    if (!activeScheduleOverlay) return null;
    for (const column of scheduleColumns) {
      const match = column.items.find((item) => item.id === activeScheduleOverlay.cardId);
      if (match) return match;
    }
    return null;
  }, [activeScheduleOverlay, scheduleColumns]);

  useEffect(() => {
    if (!activeScheduleOverlay) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveScheduleOverlay(null);
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (scheduleOverlayRef.current?.contains(target)) return;
      setActiveScheduleOverlay(null);
    };
    window.addEventListener("keydown", onEscape);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [activeScheduleOverlay]);

  const scheduleOverlayContent =
    activeScheduleOverlay && activeScheduleCard && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={scheduleOverlayRef}
            className={`admin-schedule-overlay-panel admin-schedule-overlay-panel-${activeScheduleOverlay.kind}`}
            style={{
              top: activeScheduleOverlay.top,
              left: activeScheduleOverlay.left,
              maxHeight: activeScheduleOverlay.maxHeight,
            }}
          >
            {activeScheduleOverlay.kind === "datetime" ? (
              <DateTimePanel
                dateValue={activeScheduleCard.dateValue}
                timeValue={activeScheduleCard.timeValue}
                onCancel={() => setActiveScheduleOverlay(null)}
                onApply={(nextValue) => {
                  updateScheduleItem(activeScheduleCard.id, (previousItem) => ({
                    ...previousItem,
                    dateValue: nextValue.dateValue,
                    timeValue: nextValue.timeValue,
                  }));
                  setActiveScheduleOverlay(null);
                }}
              />
            ) : null}

            {activeScheduleOverlay.kind === "handler" ? (
              <div className="admin-schedule-overlay-list-wrap">
                <h5>Pilih Penangan</h5>
                <div className="admin-schedule-overlay-list">
                  {scheduleHandlerOptions.map((handlerName) => {
                    const isSelected = handlerName === activeScheduleCard.handlerName;
                    return (
                      <button
                        key={handlerName}
                        type="button"
                        className={`admin-schedule-overlay-option admin-schedule-overlay-option-handler ${
                          isSelected ? "is-selected" : ""
                        }`}
                        onClick={() => {
                          updateScheduleItem(activeScheduleCard.id, (previousItem) => ({
                            ...previousItem,
                            handlerName,
                          }));
                          setActiveScheduleOverlay(null);
                        }}
                      >
                        <span>{handlerName}</span>
                        {isSelected ? <Check size={15} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeScheduleOverlay.kind === "service" ? (
              <div className="admin-schedule-overlay-list-wrap">
                <h5>Jenis Layanan</h5>
                <div className="admin-schedule-overlay-list">
                  {[
                    { value: "tatap_muka" as const, label: "Tatap Muka" },
                    { value: "online" as const, label: "Online" },
                  ].map((serviceOption) => {
                    const isSelected = serviceOption.value === activeScheduleCard.serviceType;
                    return (
                      <button
                        key={serviceOption.value}
                        type="button"
                        className={`admin-schedule-overlay-option admin-schedule-overlay-option-service admin-schedule-overlay-option-service-${serviceOption.value} ${
                          isSelected ? "is-selected" : ""
                        }`}
                        onClick={() => {
                          updateScheduleItem(activeScheduleCard.id, (previousItem) => ({
                            ...previousItem,
                            serviceType: serviceOption.value,
                          }));
                          setActiveScheduleOverlay(null);
                        }}
                      >
                        {serviceOption.value === "online" ? <Video size={15} /> : <Users size={15} />}
                        <span>{serviceOption.label}</span>
                        {isSelected ? <Check size={15} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null;

  if (!isReady || !user || !isAdminRole(user.role)) {
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
            <>
              <div className="admin-stat-grid">
                <article className="admin-stat-card admin-stat-card-waiting">
                  <p>Menunggu Balasan</p>
                  <strong><AnimatedCounter value={waitingCount} /></strong>
                </article>
                <article className="admin-stat-card admin-stat-card-replied">
                  <p>Sudah Dibalas</p>
                  <strong><AnimatedCounter value={repliedCount} /></strong>
                </article>
                <article className="admin-stat-card admin-stat-card-done">
                  <p>Selesai</p>
                  <strong><AnimatedCounter value={doneCount} /></strong>
                </article>
                <article className="admin-stat-card admin-stat-card-total">
                  <p>Total</p>
                  <strong><AnimatedCounter value={totalCount} /></strong>
                </article>
              </div>

              <article className="admin-line-card">
                <div className="admin-line-header">
                  <h2>Total Konseling</h2>
                  <div className="admin-line-range">
                    <button
                      type="button"
                      className={trendRange === "day" ? "is-active" : ""}
                      onClick={() => setTrendRange("day")}
                    >
                      Per Hari
                    </button>
                    <button
                      type="button"
                      className={trendRange === "month" ? "is-active" : ""}
                      onClick={() => setTrendRange("month")}
                    >
                      Per Bulan
                    </button>
                    <button
                      type="button"
                      className={trendRange === "year" ? "is-active" : ""}
                      onClick={() => setTrendRange("year")}
                    >
                      Per Tahun
                    </button>
                  </div>
                </div>

                <div className="admin-line-chart-wrap">
                  <div className="admin-line-chart-canvas">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 24, right: 18, left: 2, bottom: 4 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke="rgba(17, 24, 39, 0.08)"
                          strokeDasharray="0"
                        />
                        <XAxis
                          dataKey="label"
                          interval={0}
                          tickLine={false}
                          axisLine={{ stroke: "rgba(17, 24, 39, 0.24)" }}
                          tick={{ fill: "#8B95A7", fontSize: 12, fontWeight: 600 }}
                          tickMargin={16}
                          minTickGap={0}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={{ stroke: "rgba(17, 24, 39, 0.24)" }}
                          tick={{ fill: "#8B95A7", fontSize: 12, fontWeight: 600 }}
                          width={40}
                          tickMargin={8}
                          domain={[0, "dataMax + 1"]}
                        />
                        <Tooltip
                          cursor={{ stroke: "rgba(84, 171, 199, 0.28)", strokeWidth: 1 }}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid rgba(17,24,39,0.1)",
                            boxShadow: "0 8px 20px rgba(17,24,39,0.08)",
                            fontSize: 12,
                          }}
                          formatter={(value) => [`${value ?? 0}`, "Total Konseling"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#2D7F9A"
                          strokeWidth={4}
                          dot={{
                            r: 6,
                            stroke: "#2D7F9A",
                            strokeWidth: 4,
                            fill: "#ffffff",
                          }}
                          activeDot={{
                            r: 7,
                            stroke: "#2D7F9A",
                            strokeWidth: 4,
                            fill: "#ffffff",
                          }}
                          isAnimationActive={true}
                          animationDuration={1500}
                        >
                          <LabelList
                            dataKey="value"
                            position="top"
                            offset={10}
                            style={{
                              fill: "#2D7F9A",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </article>

              <article className="admin-topic-card">
                <h2>Grafik Topik Konseling</h2>
                <div 
                  className="admin-topic-chart-wrap"
                  style={{
                    maxHeight: "160px", // Fits exactly 3 bars
                    overflowY: "auto",
                    paddingRight: "6px",
                    display: "block"
                  }}
                >
                  <ResponsiveContainer width="100%" height={Math.max(160, topicStats.length * 48)}>
                    <BarChart
                      data={topicStats}
                      layout="vertical"
                      margin={{ top: 8, right: 35, left: 4, bottom: 4 }}
                      barCategoryGap={10}
                    >
                      <CartesianGrid
                        horizontal={false}
                        stroke="rgba(17, 24, 39, 0.08)"
                        strokeDasharray="0"
                      />
                      <XAxis
                        type="number"
                        hide
                        allowDecimals={false}
                        domain={[0, (dataMax) => Math.ceil(dataMax * 1.15 + 10)]}
                      />
                      <YAxis
                        type="category"
                        dataKey="topic"
                        axisLine={false}
                        tickLine={false}
                        width={150}
                        tick={{ fill: "#6B7280", fontSize: 14, fontWeight: 600 }}
                        tickFormatter={(tick) => tick.replace(/^Konseling\s+/i, "")}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(84, 171, 199, 0.08)" }}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid rgba(17,24,39,0.1)",
                          boxShadow: "0 8px 20px rgba(17,24,39,0.08)",
                          fontSize: 12,
                        }}
                        formatter={(value) => [`${value ?? 0}`, "Jumlah Kasus"]}
                      />
                      <Bar
                        dataKey="value"
                        fill="#54ABC7"
                        radius={[999, 999, 999, 999]}
                        barSize={18}
                        background={{
                          fill: "#E8F0F7",
                          radius: 999,
                        }}
                        isAnimationActive={true}
                        animationDuration={1500}
                      >
                        <LabelList
                          dataKey="value"
                          position="right"
                          offset={10}
                          style={{
                            fill: "#2D7F9A",
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

            </>
          ) : tab === "schedules" ? (
            <>
              <article className="admin-schedule-toolbar">
                <div className="admin-schedule-toolbar-copy">
                  <h2>Jadwal Konseling</h2>
                </div>
                <div className="admin-schedule-toolbar-actions">
                  <div className="admin-schedule-view-toggle" aria-label="Mode tampilan jadwal">
                    <button
                      type="button"
                      className={scheduleViewMode === "kanban" ? "is-active" : ""}
                      onClick={() => setScheduleViewMode("kanban")}
                      aria-label="Tampilan kanban"
                      title="Kanban"
                    >
                      <PanelsTopLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className={scheduleViewMode === "calendar" ? "is-active" : ""}
                      onClick={() => setScheduleViewMode("calendar")}
                      aria-label="Tampilan kalender"
                      title="Kalender"
                    >
                      <CalendarDays size={16} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="button button-primary admin-schedule-add-button"
                    onClick={openAddScheduleModal}
                  >
                    <Plus size={16} />
                    Tambah Jadwal
                  </button>
                </div>
              </article>

              {scheduleViewMode === "kanban" ? (
                <div className="admin-schedule-board" aria-label="Kolom jadwal konseling">
                {scheduleColumns.map((column) => {
                  const isCollapsed = collapsedColumns.includes(column.id);
                  return (
                    <section
                      key={column.id}
                      className={`admin-schedule-column admin-schedule-column-${column.id} ${
                        isCollapsed ? "is-collapsed" : ""
                      }`}
                    >
                      <header className="admin-schedule-column-head">
                        <div className="admin-schedule-column-head-title">
                          <h3>{column.title}</h3>
                          <span>{column.items.length}</span>
                        </div>
                        <button
                          type="button"
                          className="admin-schedule-column-toggle"
                          onClick={() => toggleColumnCollapse(column.id)}
                          aria-label={isCollapsed ? "Expand column" : "Collapse column"}
                        >
                          {isCollapsed ? <Expand size={14} /> : <Shrink size={14} />}
                        </button>
                      </header>
                      
                      <div className="admin-schedule-column-body-wrap">
                        <p>{column.description}</p>
                        <div
                          className={`admin-schedule-column-list ${
                            dragOverColumnId === column.id ? "is-drag-over" : ""
                          }`}
                          onDragOver={(event) => handleDragOver(event, column.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(event) => handleDrop(event, column.id)}
                        >
                          {column.items.map((item) => {
                            const isDateTimeOpen =
                              activeScheduleOverlay?.cardId === item.id &&
                              activeScheduleOverlay.kind === "datetime";
                            const isHandlerOpen =
                              activeScheduleOverlay?.cardId === item.id &&
                              activeScheduleOverlay.kind === "handler";
                            const isServiceOpen =
                              activeScheduleOverlay?.cardId === item.id &&
                              activeScheduleOverlay.kind === "service";
                            const isDragging = draggedCardId === item.id;

                            return (
                              <article
                                key={item.id}
                                className={`admin-schedule-card ${isDragging ? "is-dragging" : ""}`}
                                draggable
                                onDragStart={(event) => handleDragStart(event, item.id)}
                                onDragEnd={handleDragEnd}
                              >
                                <h4>{item.clientName}</h4>
                                <div className="admin-schedule-pill-row">
                                  <button
                                    type="button"
                                    className={`admin-schedule-pill admin-schedule-pill-calendar ${
                                      isDateTimeOpen ? "is-active" : ""
                                    }`}
                                    onClick={(event) => openScheduleOverlay(event, item, "datetime")}
                                  >
                                    <CalendarDays size={14} />
                                    {formatScheduleDateLabel(item.dateValue)} •{" "}
                                    {formatScheduleTimeDisplay(item.timeValue)}
                                  </button>
                                  <button
                                    type="button"
                                    className={`admin-schedule-pill ${isHandlerOpen ? "is-active" : ""}`}
                                    onClick={(event) => openScheduleOverlay(event, item, "handler")}
                                  >
                                    <UserRound size={14} />
                                    {item.handlerName}
                                  </button>
                                  <button
                                    type="button"
                                    className={`admin-schedule-pill admin-schedule-pill-service admin-schedule-pill-service-${item.serviceType} ${
                                      isServiceOpen ? "is-active" : ""
                                    }`}
                                    onClick={(event) => openScheduleOverlay(event, item, "service")}
                                  >
                                    {item.serviceType === "online" ? <Video size={14} /> : <Users size={14} />}
                                    {item.serviceType === "online" ? "Online" : "Tatap Muka"}
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
              </section>
            );
              })}
              </div>
              ) : (
                <ScheduleCalendar 
                  columns={scheduleColumns} 
                  onOpenOverlay={openScheduleOverlay as any}
                  formatDate={formatScheduleDateLabel}
                  formatTime={formatScheduleTimeDisplay}
                  onStatusChange={updateScheduleItemStatus}
                />
              )}
            </>
          ) : tab === "tickets" ? (
            <>
              <div className="admin-tab-tools">
                <input
                  type="search"
                  className="admin-search-input"
                  placeholder="Cari tiket..."
                  value={ticketQuery}
                  onChange={(event) => setTicketQuery(event.target.value)}
                />
                <details className="admin-ticket-filter">
                  <summary className="admin-filter-trigger" aria-label="Filter status tiket">
                    <SlidersHorizontal size={16} />
                    {isFilterActive ? <span className="admin-filter-dot" aria-hidden="true" /> : null}
                  </summary>
                  <div className="admin-filter-dropdown">
                    <button
                      type="button"
                      className={`admin-filter-option ${
                        ticketFilter === "all" ? "admin-filter-option-active" : ""
                      }`}
                      onClick={onSelectFilter("all")}
                    >
                      Semua Status
                    </button>
                    <button
                      type="button"
                      className={`admin-filter-option ${
                        ticketFilter === "open" ? "admin-filter-option-active" : ""
                      }`}
                      onClick={onSelectFilter("open")}
                    >
                      Menunggu Balasan
                    </button>
                    <button
                      type="button"
                      className={`admin-filter-option ${
                        ticketFilter === "in_progress" ? "admin-filter-option-active" : ""
                      }`}
                      onClick={onSelectFilter("in_progress")}
                    >
                      Sudah Dibalas
                    </button>
                    <button
                      type="button"
                      className={`admin-filter-option ${
                        ticketFilter === "resolved" ? "admin-filter-option-active" : ""
                      }`}
                      onClick={onSelectFilter("resolved")}
                    >
                      Selesai
                    </button>
                  </div>
                </details>
              </div>
              <div
                style={{
                  maxHeight: "330px", // Fits exactly 3 cards + gaps
                  overflowY: "auto",
                  paddingRight: "6px",
                  display: "block"
                }}
              >
                <div className="admin-scroll-list">
                  {paginatedTickets.map((ticket) => {
                    console.log("DEBUG TICKET:", { id: ticket.id, title: ticket.title, keys: Object.keys(ticket) });
                    return (
                      <article key={ticket.id} className="my-counseling-card my-counseling-card-ticket">
                        <div 
                          className={`my-counseling-card-top ticket-top-${ticket.status}`}
                          style={{ gridRow: 1, gridColumn: "1 / 3" }}
                        >
                          <div className="my-counseling-ticket-head">
                            <span className={`ticket-status ticket-status-${ticket.status}`}>
                              {ticketStatusLabel[ticket.status]}
                            </span>
                          </div>
                        </div>

                        <div 
                          className="my-counseling-content my-counseling-content-ticket"
                          style={{ gridRow: 2, gridColumn: 1 }}
                        >
                          <h2>{ticket.title}</h2>
                          <p>
                            {(() => {
                              const dateVal = ticket.created_at || ticket.createdAt;
                              const formatted = dateVal
                                ? new Date(dateVal).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "";
                              const studentName =
                                ticket.student?.full_name ||
                                ticket.student?.fullName ||
                                (ticket.student_id ? studentNameById[ticket.student_id] : null) ||
                                (ticket.studentId ? studentNameById[ticket.studentId] : null) ||
                                "Mahasiswa";
                              return `${formatted} • ${studentName}`;
                            })()}
                          </p>
                        </div>

                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          className="my-counseling-arrow-link"
                          aria-label={`Buka tiket ${ticket.code}`}
                          style={{ gridRow: 2, gridColumn: 2 }}
                        >
                          <span className="my-counseling-arrow" aria-hidden="true">
                            <ChevronRight size={20} />
                          </span>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Pagination Controller */}
              {filteredTickets.length > ticketsPerPage && (
                <div 
                  className="admin-pagination-bar" 
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "16px",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.08)"
                  }}
                >
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={ticketPage === 1}
                    onClick={() => setTicketPage(p => Math.max(1, p - 1))}
                    style={{ minHeight: "36px", padding: "0 12px", fontSize: "13px" }}
                  >
                    Prev
                  </button>

                  {(() => {
                    const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
                    const pages: (number | string)[] = [];
                    
                    if (totalPages <= 5) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (ticketPage > 3) {
                        pages.push("...");
                      }
                      
                      const startPage = Math.max(2, ticketPage - 1);
                      const endPage = Math.min(totalPages - 1, ticketPage + 1);
                      
                      for (let i = startPage; i <= endPage; i++) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      
                      if (ticketPage < totalPages - 2) {
                        pages.push("...");
                      }
                      if (!pages.includes(totalPages)) pages.push(totalPages);
                    }

                    return pages.map((page, idx) => {
                      if (page === "...") {
                        return <span key={`dots-${idx}`} style={{ opacity: 0.5, color: "var(--text-secondary)" }}>...</span>;
                      }
                      return (
                        <button
                          key={`page-${page}`}
                          type="button"
                          className={ticketPage === page ? "button button-primary" : "button button-secondary"}
                          onClick={() => setTicketPage(page as number)}
                          style={{
                            minHeight: "36px",
                            width: "36px",
                            padding: 0,
                            fontSize: "13px",
                            borderRadius: "50%",
                            background: ticketPage === page ? "var(--blue)" : "transparent",
                            borderColor: ticketPage === page ? "var(--blue)" : "transparent",
                            color: ticketPage === page ? "#fff" : "var(--blue-dark)"
                          }}
                        >
                          {page}
                        </button>
                      );
                    });
                  })()}

                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={ticketPage === Math.ceil(filteredTickets.length / ticketsPerPage)}
                    onClick={() => setTicketPage(p => Math.min(Math.ceil(filteredTickets.length / ticketsPerPage), p + 1))}
                    style={{ minHeight: "36px", padding: "0 12px", fontSize: "13px" }}
                  >
                    Next
                  </button>
                </div>
              )}
              {filteredTickets.length === 0 ? (
                <div className="my-counseling-empty">
                  <h3>Tiket tidak ditemukan.</h3>
                  <p>
                    {filteredTicketsByQueryOnly.length > 0
                      ? "Coba ubah filter status tiket."
                      : "Coba kata kunci lain untuk mencari tiket."}
                  </p>
                </div>
              ) : null}
            </>
          ) : tab === "students" ? (
            <>
              <div className="admin-tab-tools">
                <input
                  type="search"
                  className="admin-search-input"
                  placeholder="Cari nama mahasiswa..."
                  value={studentQuery}
                  onChange={(event) => setStudentQuery(event.target.value)}
                />
              </div>
              <div
                style={{
                  maxHeight: "330px", // Fits exactly 3 cards + gaps
                  overflowY: "auto",
                  paddingRight: "6px",
                  display: "block"
                }}
              >
                <div className="admin-scroll-list">
                  {paginatedStudents.map((student) => (
                    <article key={student.id} className="admin-student-card">
                      <div className="admin-student-card-main">
                        <h2>{student.full_name || student.fullName}</h2>
                        <p className="admin-student-meta">
                          {student.gender} • {student.faculty}
                        </p>
                      </div>
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="my-counseling-arrow-link"
                        aria-label={`Buka detail mahasiswa ${student.full_name || student.fullName}`}
                      >
                        <span className="my-counseling-arrow" aria-hidden="true">
                          <ChevronRight size={20} />
                        </span>
                      </Link>
                    </article>
                  ))}
                </div>
              </div>

              {/* Pagination Controller Mahasiswa */}
              {filteredStudents.length > studentsPerPage && (
                <div 
                  className="admin-pagination-bar" 
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "16px",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.08)"
                  }}
                >
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={studentPage === 1}
                    onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                    style={{ minHeight: "36px", padding: "0 12px", fontSize: "13px" }}
                  >
                    Prev
                  </button>

                  {(() => {
                    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
                    const pages: (number | string)[] = [];
                    
                    if (totalPages <= 5) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (studentPage > 3) {
                        pages.push("...");
                      }
                      
                      const startPage = Math.max(2, studentPage - 1);
                      const endPage = Math.min(totalPages - 1, studentPage + 1);
                      
                      for (let i = startPage; i <= endPage; i++) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      
                      if (studentPage < totalPages - 2) {
                        pages.push("...");
                      }
                      if (!pages.includes(totalPages)) pages.push(totalPages);
                    }

                    return pages.map((page, idx) => {
                      if (page === "...") {
                        return <span key={`dots-${idx}`} style={{ opacity: 0.5, color: "var(--text-secondary)" }}>...</span>;
                      }
                      return (
                        <button
                          key={`page-${page}`}
                          type="button"
                          className={studentPage === page ? "button button-primary" : "button button-secondary"}
                          onClick={() => setStudentPage(page as number)}
                          style={{
                            minHeight: "36px",
                            width: "36px",
                            padding: 0,
                            fontSize: "13px",
                            borderRadius: "50%",
                            background: studentPage === page ? "var(--blue)" : "transparent",
                            borderColor: studentPage === page ? "var(--blue)" : "transparent",
                            color: studentPage === page ? "#fff" : "var(--blue-dark)"
                          }}
                        >
                          {page}
                        </button>
                      );
                    });
                  })()}

                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={studentPage === Math.ceil(filteredStudents.length / studentsPerPage)}
                    onClick={() => setStudentPage(p => Math.min(Math.ceil(filteredStudents.length / studentsPerPage), p + 1))}
                    style={{ minHeight: "36px", padding: "0 12px", fontSize: "13px" }}
                  >
                    Next
                  </button>
                </div>
              )}
              {filteredStudents.length === 0 ? (
                <div className="my-counseling-empty">
                  <h3>Mahasiswa tidak ditemukan.</h3>
                  <p>Coba kata kunci lain untuk mencari mahasiswa.</p>
                </div>
              ) : null}
            </>
          ) : tab === "admins" && isSuperadmin ? (
            <>
              <div className="admin-tab-tools admin-tab-tools-admins">
                <input
                  type="search"
                  className="admin-search-input"
                  placeholder="Cari admin..."
                  value={adminQuery}
                  onChange={(event) => setAdminQuery(event.target.value)}
                />
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    setIsAddAdminModalOpen(true);
                    if (adminFormError) setAdminFormError("");
                    if (adminFormMessage) setAdminFormMessage("");
                  }}
                >
                  <Plus size={16} />
                  Tambah Admin
                </button>
              </div>
              {adminFormError ? <p className="admin-form-error">{adminFormError}</p> : null}
              {adminFormMessage ? <p className="admin-form-success">{adminFormMessage}</p> : null}

              <div
                style={{
                  maxHeight: "330px", // Fits exactly 3 cards + gaps
                  overflowY: "auto",
                  paddingRight: "6px",
                  display: "block"
                }}
              >
                <div className="admin-scroll-list">
                  {paginatedAdminAccounts.map((account) => {
                    return (
                      <article key={account.nim} className="admin-admin-card">
                        <div className="admin-admin-card-main">
                          <h2>{account.fullName}</h2>
                          <div className="admin-admin-card-meta">
                            <span className="admin-admin-card-email">{account.email ?? "-"}</span>
                            <span className="admin-admin-card-role">
                              {getRoleLabel(account.role)}
                              {account.isActive === false && (
                                <span style={{ marginLeft: "8px", padding: "2px 6px", borderRadius: "6px", backgroundColor: "rgba(220, 38, 38, 0.12)", color: "#ef4444", fontSize: "10px", fontWeight: 700 }}>
                                  Nonaktif
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/admin/admins/${account.nim}`}
                          className="my-counseling-arrow-link admin-admin-arrow-link"
                          aria-label={`Buka detail admin ${account.fullName}`}
                        >
                          <span className="my-counseling-arrow" aria-hidden="true">
                            <ChevronRight size={20} />
                          </span>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Pagination Controller Admin */}
              {filteredAdminAccounts.length > adminsPerPage && (
                <div 
                  className="admin-pagination-bar" 
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "16px",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.08)"
                  }}
                >
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={adminPage === 1}
                    onClick={() => setAdminPage(p => Math.max(1, p - 1))}
                    style={{ minHeight: "36px", padding: "0 12px", fontSize: "13px" }}
                  >
                    Prev
                  </button>

                  {(() => {
                    const totalPages = Math.ceil(filteredAdminAccounts.length / adminsPerPage);
                    const pages: (number | string)[] = [];
                    
                    if (totalPages <= 5) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (adminPage > 3) {
                        pages.push("...");
                      }
                      
                      const startPage = Math.max(2, adminPage - 1);
                      const endPage = Math.min(totalPages - 1, adminPage + 1);
                      
                      for (let i = startPage; i <= endPage; i++) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      
                      if (adminPage < totalPages - 2) {
                        pages.push("...");
                      }
                      if (!pages.includes(totalPages)) pages.push(totalPages);
                    }

                    return pages.map((page, idx) => {
                      if (page === "...") {
                        return <span key={`dots-${idx}`} style={{ opacity: 0.5, color: "var(--text-secondary)" }}>...</span>;
                      }
                      return (
                        <button
                          key={`page-${page}`}
                          type="button"
                          className={adminPage === page ? "button button-primary" : "button button-secondary"}
                          onClick={() => setAdminPage(page as number)}
                          style={{
                            minHeight: "36px",
                            width: "36px",
                            padding: 0,
                            fontSize: "13px",
                            borderRadius: "50%",
                            background: adminPage === page ? "var(--blue)" : "transparent",
                            borderColor: adminPage === page ? "var(--blue)" : "transparent",
                            color: adminPage === page ? "#fff" : "var(--blue-dark)"
                          }}
                        >
                          {page}
                        </button>
                      );
                    });
                  })()}

                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={adminPage === Math.ceil(filteredAdminAccounts.length / adminsPerPage)}
                    onClick={() => setAdminPage(p => Math.min(Math.ceil(filteredAdminAccounts.length / adminsPerPage), p + 1))}
                    style={{ minHeight: "36px", padding: "0 12px", fontSize: "13px" }}
                  >
                    Next
                  </button>
                </div>
              )}
              {filteredAdminAccounts.length === 0 ? (
                <div className="my-counseling-empty">
                  <h3>Admin tidak ditemukan.</h3>
                  <p>Coba kata kunci lain untuk mencari admin.</p>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <article className="admin-profile-card">
                <div className="admin-profile-identity">
                  <h2>{user.fullName}</h2>
                  <p>
                    {user.role === "superadmin"
                      ? "Superadmin Layanan Konseling"
                      : "Admin Layanan Konseling"}
                  </p>
                </div>
                <div className="admin-profile-summary">
                  <span>Balasan Saya</span>
                  <strong>{firstReplyTicketsForAdmin.length}</strong>
                </div>
              </article>

              <div
                className={`admin-scroll-list ${
                  firstReplyTicketsForAdmin.length > 4 ? "admin-scroll-list-active" : ""
                }`}
              >
                {firstReplyTicketsForAdmin.map((ticket) => (
                  <article key={ticket.id} className="my-counseling-card my-counseling-card-ticket">
                    <div className={`my-counseling-card-top ticket-top-${ticket.status}`}>
                      <div className="my-counseling-ticket-head">
                        <span className={`ticket-status ticket-status-${ticket.status}`}>
                          {ticketStatusLabel[ticket.status]}
                        </span>
                      </div>
                    </div>

                    <div className="my-counseling-content my-counseling-content-ticket">
                      <h2>{ticket.title}</h2>
                      <p>
                        {(() => {
                          const dateVal = ticket.created_at || ticket.createdAt;
                          const formatted = dateVal
                            ? new Date(dateVal).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "";
                          const studentName =
                            ticket.student?.full_name ||
                            ticket.student?.fullName ||
                            (ticket.student_id ? studentNameById[ticket.student_id] : null) ||
                            (ticket.studentId ? studentNameById[ticket.studentId] : null) ||
                            "Mahasiswa";
                          return `${formatted} • ${studentName}`;
                        })()}
                      </p>
                    </div>

                    <Link
                      href={`/admin/tickets/${ticket.id}`}
                      className="my-counseling-arrow-link"
                      aria-label={`Buka tiket ${ticket.code}`}
                    >
                      <span className="my-counseling-arrow" aria-hidden="true">
                        <ChevronRight size={20} />
                      </span>
                    </Link>
                  </article>
                ))}
              </div>
              {firstReplyTicketsForAdmin.length === 0 ? (
                <div className="my-counseling-empty">
                  <h3>Belum ada tiket sebagai pembalas pertama.</h3>
                  <p>Data akan tampil setelah kamu menjadi admin pembalas pertama di tiket.</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
      {scheduleOverlayContent}
      {isMounted && isAddScheduleModalOpen ? createPortal(
        <div
          className="admin-add-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Tambah jadwal konseling"
        >
          <button
            type="button"
            className="admin-add-backdrop"
            aria-label="Tutup pop up tambah jadwal"
            onClick={() => setIsAddScheduleModalOpen(false)}
          />
          <article className="admin-add-panel admin-schedule-add-panel">
            <header className="admin-add-header">
              <h3>Tambah Jadwal</h3>
              <button
                type="button"
                className="admin-add-close"
                aria-label="Tutup"
                onClick={() => setIsAddScheduleModalOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <form className="admin-add-form" onSubmit={submitSchedule}>
              <div className="admin-add-field student-profile-dropdown">
                <span>Klien</span>
                <button
                  type="button"
                  className={`student-profile-dropdown-trigger ${
                    activeAddScheduleMenu === "client" ? "is-open" : ""
                  }`}
                  onClick={() =>
                    setActiveAddScheduleMenu((previous) =>
                      previous === "client" ? null : "client"
                    )
                  }
                >
                  <strong>
                    {scheduleClientOptions.find((option) => option.id === addScheduleClientId)?.label ??
                      "Pilih klien"}
                  </strong>
                  <ChevronDown size={16} />
                </button>
                {activeAddScheduleMenu === "client" ? (
                  <div className="student-profile-dropdown-menu dropdown-menu-searchable">
                    <div className="dropdown-search-wrapper">
                      <input
                        type="text"
                        className="dropdown-search-input"
                        placeholder="Cari nama atau NIM..."
                        value={scheduleClientSearchQuery}
                        onChange={(e) => setScheduleClientSearchQuery(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="dropdown-options-list">
                      {filteredScheduleClientOptions.length > 0 ? (
                        filteredScheduleClientOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`student-profile-dropdown-option ${
                              option.id === addScheduleClientId ? "is-active" : ""
                            }`}
                            onClick={() => {
                              setAddScheduleClientId(option.id);
                              setActiveAddScheduleMenu(null);
                              if (addScheduleError) setAddScheduleError("");
                            }}
                          >
                            {option.label}
                          </button>
                        ))
                      ) : (
                        <div className="dropdown-no-results">Klien tidak ditemukan</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="admin-add-field student-profile-dropdown">
                <span>Tanggal dan Jam</span>
                <button
                  type="button"
                  className={`student-profile-dropdown-trigger ${
                    activeAddScheduleMenu === "datetime" ? "is-open" : ""
                  }`}
                  onClick={() =>
                    setActiveAddScheduleMenu((previous) =>
                      previous === "datetime" ? null : "datetime"
                    )
                  }
                >
                  <strong>
                    {formatScheduleDateLabel(addScheduleDateValue)} •{" "}
                    {formatScheduleTimeDisplay(addScheduleTimeValue)}
                  </strong>
                  <CalendarDays size={16} />
                </button>
                {activeAddScheduleMenu === "datetime" ? (
                  <div className="admin-schedule-add-datetime-popover">
                    <DateTimePanel
                      dateValue={addScheduleDateValue}
                      timeValue={addScheduleTimeValue}
                      onCancel={() => setActiveAddScheduleMenu(null)}
                      onApply={(nextValue) => {
                        setAddScheduleDateValue(nextValue.dateValue);
                        setAddScheduleTimeValue(nextValue.timeValue);
                        setActiveAddScheduleMenu(null);
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="student-profile-form-row">
                <div className="admin-add-field student-profile-dropdown">
                  <span>Penangan</span>
                  <button
                    type="button"
                    className={`student-profile-dropdown-trigger ${
                      activeAddScheduleMenu === "handler" ? "is-open" : ""
                    }`}
                    onClick={() =>
                      setActiveAddScheduleMenu((previous) =>
                        previous === "handler" ? null : "handler"
                      )
                    }
                  >
                    <strong>{addScheduleHandlerName || "Pilih penangan"}</strong>
                    <ChevronDown size={16} />
                  </button>
                  {activeAddScheduleMenu === "handler" ? (
                    <div className="student-profile-dropdown-menu dropdown-menu-searchable">
                      <div className="dropdown-search-wrapper">
                        <input
                          type="text"
                          className="dropdown-search-input"
                          placeholder="Cari penangan..."
                          value={scheduleHandlerSearchQuery}
                          onChange={(e) => setScheduleHandlerSearchQuery(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="dropdown-options-list">
                        {filteredScheduleHandlerOptions.length > 0 ? (
                          filteredScheduleHandlerOptions.map((handlerName) => (
                            <button
                              key={handlerName}
                              type="button"
                              className={`student-profile-dropdown-option ${
                                handlerName === addScheduleHandlerName ? "is-active" : ""
                              }`}
                              onClick={() => {
                                setAddScheduleHandlerName(handlerName);
                                setActiveAddScheduleMenu(null);
                                if (addScheduleError) setAddScheduleError("");
                              }}
                            >
                              {handlerName}
                            </button>
                          ))
                        ) : (
                          <div className="dropdown-no-results">Penangan tidak ditemukan</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="admin-add-field student-profile-dropdown">
                  <span>Jenis Layanan</span>
                  <button
                    type="button"
                    className={`student-profile-dropdown-trigger ${
                      activeAddScheduleMenu === "service" ? "is-open" : ""
                    }`}
                    onClick={() =>
                      setActiveAddScheduleMenu((previous) =>
                        previous === "service" ? null : "service"
                      )
                    }
                  >
                    <strong>
                      {addScheduleServiceType === "online" ? "Online" : "Tatap Muka"}
                    </strong>
                    <ChevronDown size={16} />
                  </button>
                  {activeAddScheduleMenu === "service" ? (
                    <div className="student-profile-dropdown-menu">
                      {[
                        { value: "tatap_muka" as const, label: "Tatap Muka" },
                        { value: "online" as const, label: "Online" },
                      ].map((serviceOption) => (
                        <button
                          key={serviceOption.value}
                          type="button"
                          className={`student-profile-dropdown-option ${
                            serviceOption.value === addScheduleServiceType ? "is-active" : ""
                          }`}
                          onClick={() => {
                            setAddScheduleServiceType(serviceOption.value);
                            setActiveAddScheduleMenu(null);
                          }}
                        >
                          {serviceOption.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {addScheduleError ? <p className="admin-form-error">{addScheduleError}</p> : null}

              <div className="admin-add-form-actions admin-add-form-actions-inline">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsAddScheduleModalOpen(false)}
                >
                  Batal
                </button>
                <button type="submit" className="button button-primary">
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </article>
        </div>,
        document.body
      ) : null}
      {isMounted && isAddAdminModalOpen ? createPortal(
        <div className="admin-add-modal" role="dialog" aria-modal="true" aria-label="Tambah admin baru">
          <button
            type="button"
            className="admin-add-backdrop"
            aria-label="Tutup pop up tambah admin"
            onClick={() => setIsAddAdminModalOpen(false)}
          />
          <article className="admin-add-panel">
            <header className="admin-add-header">
              <h3>Tambah Admin</h3>
              <button
                type="button"
                className="admin-add-close"
                aria-label="Tutup"
                onClick={() => setIsAddAdminModalOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <form className="admin-add-form" onSubmit={submitAdmin}>
              <label className="admin-add-field">
                <span>Email Admin</span>
                <input
                  type="email"
                  className="admin-search-input"
                  placeholder="admin@ub.ac.id"
                  value={newAdminEmail}
                  onChange={(event) => {
                    setNewAdminEmail(event.target.value);
                    if (adminFormError) setAdminFormError("");
                    if (adminFormMessage) setAdminFormMessage("");
                  }}
                  autoComplete="email"
                />
              </label>
              <label className="admin-add-field">
                <span>Role Staf</span>
                <select
                  className="admin-search-input"
                  value={newAdminRole}
                  onChange={(event) => {
                    setNewAdminRole(event.target.value as AuthRole);
                    if (adminFormError) setAdminFormError("");
                    if (adminFormMessage) setAdminFormMessage("");
                  }}
                >
                  <option value="admin">Admin / Konselor</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </label>
              <button type="submit" className="button button-primary">
                Simpan Admin
              </button>
            </form>
          </article>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
