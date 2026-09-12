import type { TicketStatus } from "../tickets/mock-data";

export type TicketViewer = "student" | "admin";

/** Nama warna chip: dipetakan ke kelas .ticket-status-*, .ticket-top-*, .ticket-status-banner-*. */
export type TicketStatusTone = TicketStatus | "unhandled";

export type TicketStatusMeta = {
  label: string;
  tone: TicketStatusTone;
};

type TicketStatusSource = {
  status: string;
  resolution_type?: string | null;
};

/**
 * Satu-satunya sumber label & warna status tiket di portal mahasiswa dan admin:
 * - open        -> "Menunggu Balasan" (kuning/gold)
 * - in_progress -> "Sudah Dibalas" (biru/cyan)
 * - resolved    -> "Selesai" (hijau) untuk mahasiswa; "Tertangani" (hijau) /
 *                  "Tidak Tertangani" (merah) untuk admin.
 */
export function getTicketStatusMeta(ticket: TicketStatusSource, viewer: TicketViewer): TicketStatusMeta {
  switch (ticket.status) {
    case "open":
      return { label: "Menunggu Balasan", tone: "open" };
    case "in_progress":
      return { label: "Sudah Dibalas", tone: "in_progress" };
    case "resolved":
      if (viewer === "student") return { label: "Selesai", tone: "resolved" };
      // Tiket resolved lama (resolution_type NULL) dianggap tertangani, sama
      // seperti perhitungan statistik dashboard.
      return ticket.resolution_type === "tidak_tertangani"
        ? { label: "Tidak Tertangani", tone: "unhandled" }
        : { label: "Tertangani", tone: "resolved" };
    default:
      return { label: ticket.status || "-", tone: "open" };
  }
}
