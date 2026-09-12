import Link from "next/link";
import { memo } from "react";
import { ChevronRight } from "lucide-react";
import { getTicketStatusMeta, type TicketViewer } from "./ticketStatus";
import "../styles/portal-ui.css";

type TicketListCardProps = {
  href: string;
  code: string;
  title: string;
  subtitle: string;
  status: string;
  resolutionType?: string | null;
  viewer: TicketViewer;
};

/** Kartu tiket yang dipakai di semua list tiket (mahasiswa & admin). */
export const TicketListCard = memo(function TicketListCard({
  href,
  code,
  title,
  subtitle,
  status,
  resolutionType,
  viewer,
}: TicketListCardProps) {
  const statusMeta = getTicketStatusMeta({ status, resolution_type: resolutionType }, viewer);

  return (
    <article className="my-counseling-card my-counseling-card-ticket">
      <div className={`my-counseling-card-top ticket-top-${statusMeta.tone}`}>
        <div className="my-counseling-ticket-head">
          <span className={`ticket-status ticket-status-${statusMeta.tone}`}>{statusMeta.label}</span>
        </div>
      </div>

      <div className="my-counseling-content my-counseling-content-ticket">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <Link href={href} className="my-counseling-arrow-link" aria-label={`Buka tiket ${code}`}>
        <span className="my-counseling-arrow" aria-hidden="true">
          <ChevronRight size={20} />
        </span>
      </Link>
    </article>
  );
});
