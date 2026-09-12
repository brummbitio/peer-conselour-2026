"use client";

import { useMemo } from "react";
import { MessageSquareReply } from "lucide-react";
import { CardScrollList } from "../../../_portal/CardScrollList";
import { EmptyState } from "../../../_portal/EmptyState";
import { Pagination } from "../../../_portal/Pagination";
import { TicketListCard } from "../../../_portal/TicketListCard";
import { formatShortDate } from "../../../_portal/format";
import { getTicketCreatedAt, getUserDisplayName } from "../../../_portal/types";
import type { ApiTicket, ApiUserSummary } from "../../../_portal/types";
import { usePagination } from "../../../_portal/usePagination";
import type { AdminStats } from "../types";

interface AdminProfileTabProps {
  user: {
    fullName: string;
    role: string;
  };
  adminStats: AdminStats | null;
  adminStudents: ApiUserSummary[];
}

const EMPTY_TICKETS: ApiTicket[] = [];

export function AdminProfileTab({ user, adminStats, adminStudents }: AdminProfileTabProps) {
  const firstReplyTicketsForAdmin = Array.isArray(adminStats?.first_reply_tickets)
    ? adminStats.first_reply_tickets
    : EMPTY_TICKETS;

  const studentNameById = useMemo(() => {
    const map = new Map<number, string>();
    adminStudents.forEach((student) => {
      const name = getUserDisplayName(student);
      if (name) map.set(student.id, name);
    });
    return map;
  }, [adminStudents]);

  const { page, totalPages, totalItems, pageSize, pageItems, setPage } = usePagination(firstReplyTicketsForAdmin);

  const getStudentName = (ticket: ApiTicket) => {
    const studentId = ticket.student_id ?? ticket.studentId;
    return (
      getUserDisplayName(ticket.student) ||
      (studentId !== undefined ? studentNameById.get(studentId) : undefined) ||
      "Mahasiswa"
    );
  };

  return (
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

      {firstReplyTicketsForAdmin.length === 0 ? (
        <EmptyState
          icon={MessageSquareReply}
          title="Belum ada tiket sebagai pembalas pertama."
          description="Data akan tampil setelah kamu menjadi admin pembalas pertama di tiket."
        />
      ) : (
        <>
          <CardScrollList ariaLabel="Tiket yang saya balas pertama" resetKey={page}>
            {pageItems.map((ticket) => (
              <TicketListCard
                key={ticket.id}
                href={`/admin/tickets/${ticket.id}`}
                code={ticket.code}
                title={ticket.title}
                subtitle={`${formatShortDate(getTicketCreatedAt(ticket))} • ${getStudentName(ticket)}`}
                status={ticket.status}
                resolutionType={ticket.resolution_type}
                viewer="admin"
              />
            ))}
          </CardScrollList>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            ariaLabel="Navigasi halaman tiket yang saya balas"
          />
        </>
      )}
    </>
  );
}
