import type { TicketStatus } from "../../tickets/mock-data";
import type { ApiTicket } from "../../_portal/types";

/** Respons /api/admin/stats (GetDashboardStats di backend Go). */
export type AdminStats = {
  waiting?: number;
  in_progress?: number;
  handled?: number;
  unhandled?: number;
  category_counts?: { category?: string; topic?: string; count?: number }[];
  topic_stats?: { category?: string; topic?: string; count?: number }[];
  first_reply_tickets?: ApiTicket[];
};

export type AdminTab =
  | "dashboard"
  | "schedules"
  | "tickets"
  | "students"
  | "admins"
  | "profile";

export type TrendRange = "day" | "month" | "year";

export type TicketFilter = "all" | TicketStatus;

export type CounselingScheduleStatus =
  | "pending_confirmation"
  | "scheduled"
  | "reschedule"
  | "cancelled"
  | "completed";

export type CounselingScheduleItem = {
  id: string;
  clientName: string;
  dateValue: string;
  timeValue: string;
  handlerName: string;
  serviceType: "tatap_muka" | "online";
};

export type CounselingScheduleColumn = {
  id: CounselingScheduleStatus;
  title: string;
  description: string;
  items: CounselingScheduleItem[];
};

export type ScheduleOverlayKind = "datetime" | "handler" | "service";

export type ScheduleOverlayState = {
  cardId: string;
  kind: ScheduleOverlayKind;
  top: number;
  left: number;
  maxHeight: number;
};

export type AddScheduleMenu = "client" | "datetime" | "handler" | "service" | null;

export const trendSeries: Record<
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

export const scheduleWeekdayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const scheduleMonthLabels = [
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

export const formatScheduleDateLabel = (dateValue: string) => {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year) return "";
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  const weekday = scheduleWeekdayLabels[date.getDay()] ?? "";
  const monthLabel = scheduleMonthLabels[date.getMonth()] ?? "";
  return `${weekday}, ${date.getDate()} ${monthLabel} ${date.getFullYear()}`;
};

export const formatSingleTime = (timeValue: string) => {
  if (!/^\d{2}:\d{2}$/.test(timeValue)) return "Set time";
  const [hour, minute] = timeValue.split(":").map(Number);
  const period = (hour ?? 0) >= 12 ? "PM" : "AM";
  const normalizedHour = (hour ?? 0) % 12 === 0 ? 12 : (hour ?? 0) % 12;
  return `${normalizedHour}:${`${minute ?? 0}`.padStart(2, "0")} ${period}`;
};

export const formatScheduleTimeDisplay = (timeValue: string) => {
  if (timeValue.includes("-")) {
    const [start, end] = timeValue.split("-").map(t => t.trim());
    if (!start || !end) return "Set time";
    return `${formatSingleTime(start)} - ${formatSingleTime(end)}`;
  }
  return formatSingleTime(timeValue);
};
