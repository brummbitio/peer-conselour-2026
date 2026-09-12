import type { TicketStatus } from "../tickets/mock-data";

/** User summary (student/counselor) as serialized by the Go backend (model.User). */
export type ApiUserSummary = {
  id: number;
  nim?: string | null;
  full_name?: string;
  /** Some legacy responses still use camelCase. */
  fullName?: string;
  email?: string | null;
  gender?: string | null;
  faculty?: string | null;
  department?: string | null;
  phone?: string | null;
  address?: string | null;
  origin_region?: string | null;
  originRegion?: string | null;
  malang_address?: string | null;
  malangAddress?: string | null;
};

/** Ticket from /api/tickets and /api/admin/tickets (model.Ticket). */
export type ApiTicket = {
  id: number;
  code: string;
  title: string;
  category: string;
  status: TicketStatus;
  service_type?: string;
  tahap_konseling?: string | null;
  has_psychologist_exp?: boolean | null;
  created_at?: string;
  createdAt?: string;
  closed_at?: string | null;
  resolution_type?: string | null;
  resolution_reason?: string | null;
  resolution_notes?: string | null;
  student_id?: number;
  studentId?: number;
  counselor_id?: number | null;
  student?: ApiUserSummary | null;
  counselor?: ApiUserSummary | null;
};

export function getUserDisplayName(user?: ApiUserSummary | null): string {
  return user?.full_name || user?.fullName || "";
}

export function getTicketCreatedAt(ticket: Pick<ApiTicket, "created_at" | "createdAt">): string | undefined {
  return ticket.created_at || ticket.createdAt;
}
