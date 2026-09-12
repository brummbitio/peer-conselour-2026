"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { SearchX, SlidersHorizontal, Ticket } from "lucide-react";
import { CardScrollList } from "../../../_portal/CardScrollList";
import { EmptyState } from "../../../_portal/EmptyState";
import { Pagination } from "../../../_portal/Pagination";
import { TicketListCard } from "../../../_portal/TicketListCard";
import { formatShortDate } from "../../../_portal/format";
import { getTicketCreatedAt, getUserDisplayName } from "../../../_portal/types";
import type { ApiTicket, ApiUserSummary } from "../../../_portal/types";
import { usePagination } from "../../../_portal/usePagination";
import type { TicketFilter } from "../types";

interface AdminTicketsTabProps {
  adminTickets: ApiTicket[];
  adminStudents: ApiUserSummary[];
}

const FILTER_OPTIONS: { value: TicketFilter; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "open", label: "Menunggu Balasan" },
  { value: "in_progress", label: "Sudah Dibalas" },
  { value: "resolved", label: "Selesai" },
];

type IndexedTicket = {
  ticket: ApiTicket;
  studentName: string;
  haystack: string;
};

export function AdminTicketsTab({ adminTickets, adminStudents }: AdminTicketsTabProps) {
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("all");
  const filterMenuRef = useRef<HTMLDetailsElement>(null);
  // Kata kunci ditunda (deferred): input tetap responsif saat memfilter ribuan tiket.
  const deferredQuery = useDeferredValue(ticketQuery);

  const studentNameById = useMemo(() => {
    const map = new Map<number, string>();
    adminStudents.forEach((student) => {
      const name = getUserDisplayName(student);
      if (name) map.set(student.id, name);
    });
    return map;
  }, [adminStudents]);

  // Indeks pencarian dibangun sekali per perubahan data, bukan di setiap ketikan.
  const indexedTickets = useMemo<IndexedTicket[]>(
    () =>
      adminTickets.map((ticket) => {
        const studentId = ticket.student_id ?? ticket.studentId;
        const resolvedName =
          getUserDisplayName(ticket.student) || (studentId !== undefined ? studentNameById.get(studentId) : "") || "";
        return {
          ticket,
          studentName: resolvedName || "Mahasiswa",
          haystack: `${ticket.title} ${ticket.id} ${ticket.code} ${resolvedName}`.toLowerCase(),
        };
      }),
    [adminTickets, studentNameById]
  );

  const ticketsMatchingQuery = useMemo(() => {
    const query = deferredQuery.toLowerCase().trim();
    if (!query) return indexedTickets;
    return indexedTickets.filter((entry) => entry.haystack.includes(query));
  }, [indexedTickets, deferredQuery]);

  const filteredTickets = useMemo(
    () =>
      ticketFilter === "all"
        ? ticketsMatchingQuery
        : ticketsMatchingQuery.filter((entry) => entry.ticket.status === ticketFilter),
    [ticketsMatchingQuery, ticketFilter]
  );

  const { page, totalPages, totalItems, pageSize, pageItems, setPage } = usePagination(filteredTickets);

  const selectFilter = (filter: TicketFilter) => {
    setTicketFilter(filter);
    setPage(1);
    if (filterMenuRef.current) filterMenuRef.current.open = false;
  };

  const isFilterActive = ticketFilter !== "all";

  return (
    <>
      <div className="admin-tab-tools">
        <input
          type="search"
          className="admin-search-input"
          placeholder="Cari judul, kode tiket, atau nama mahasiswa..."
          aria-label="Cari tiket"
          value={ticketQuery}
          onChange={(event) => {
            setTicketQuery(event.target.value);
            setPage(1);
          }}
        />
        <details ref={filterMenuRef} className="admin-ticket-filter">
          <summary className="admin-filter-trigger" aria-label="Filter status tiket">
            <SlidersHorizontal size={16} />
            {isFilterActive ? <span className="admin-filter-dot" aria-hidden="true" /> : null}
          </summary>
          <div className="admin-filter-dropdown">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`admin-filter-option ${
                  ticketFilter === option.value ? "admin-filter-option-active" : ""
                }`}
                onClick={() => selectFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </details>
      </div>

      {filteredTickets.length === 0 ? (
        adminTickets.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="Belum ada tiket konseling."
            description="Tiket yang diajukan mahasiswa akan tampil di sini."
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title="Tiket tidak ditemukan."
            description={
              ticketsMatchingQuery.length > 0
                ? "Coba ubah filter status tiket."
                : "Coba kata kunci lain untuk mencari tiket."
            }
          />
        )
      ) : (
        <>
          <CardScrollList ariaLabel="Daftar tiket" resetKey={page}>
            {pageItems.map(({ ticket, studentName }) => (
              <TicketListCard
                key={ticket.id}
                href={`/admin/tickets/${ticket.id}`}
                code={ticket.code}
                title={ticket.title}
                subtitle={`${formatShortDate(getTicketCreatedAt(ticket))} • ${studentName}`}
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
            ariaLabel="Navigasi halaman daftar tiket"
          />
        </>
      )}
    </>
  );
}
