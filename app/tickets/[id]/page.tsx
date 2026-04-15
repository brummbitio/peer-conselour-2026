import { SiteChrome } from "../../components";
import TicketDetailClient from "./TicketDetailClient";

export default function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <SiteChrome cleanBackground>
      <TicketDetailClient ticketId={params.id} />
    </SiteChrome>
  );
}
