import { SiteChrome } from "../../../components";
import TicketDetailClient from "../../../tickets/[id]/TicketDetailClient";

export default function AdminTicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <SiteChrome cleanBackground>
      <TicketDetailClient ticketId={params.id} mode="admin" />
    </SiteChrome>
  );
}
