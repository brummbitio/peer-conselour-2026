import { memo } from "react";
import { BackLink } from "../../../_portal/BackLink";
import { PORTAL_BACK_TARGETS } from "../../../_portal/routes";
import { getTicketStatusMeta } from "../../../_portal/ticketStatus";
import { getUserDisplayName } from "../../../_portal/types";
import type { TicketDetail, TicketViewMode } from "./types";

/** Mahasiswa kembali ke /my-counseling, admin kembali ke tab Daftar Tiket. */
export function TicketBackLink({ viewer }: { viewer: TicketViewMode }) {
  const target = viewer === "admin" ? PORTAL_BACK_TARGETS.adminTickets : PORTAL_BACK_TARGETS.studentTickets;
  return <BackLink href={target.href} label={target.label} />;
}

type TicketHeaderProps = {
  ticket: TicketDetail;
  viewer: TicketViewMode;
};

export const TicketHeader = memo(function TicketHeader({ ticket, viewer }: TicketHeaderProps) {
  const status = getTicketStatusMeta(ticket, viewer);

  return (
    <>
      <header className="ticket-chat-header">
        <p className="ticket-chat-id">Tiket ID: {ticket.code}</p>
        <div className={`ticket-status-banner ticket-status-banner-${status.tone}`}>
          <span className="ticket-status-banner-label">Status Tiket</span>
          <span className="ticket-status-banner-value">{status.label}</span>
        </div>
      </header>

      <div className="ticket-chat-subject">
        <h1>{ticket.title}</h1>
      </div>
    </>
  );
});
