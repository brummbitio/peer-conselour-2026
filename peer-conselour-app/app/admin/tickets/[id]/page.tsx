import { SiteChrome } from "../../../components";
import TicketDetailClient from "../../../tickets/[id]/TicketDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
