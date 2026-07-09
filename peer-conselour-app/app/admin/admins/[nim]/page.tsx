import { SiteChrome } from "../../../components";
import AdminDetailClient from "./AdminDetailClient";

export default function AdminAccountDetailPage({
  params,
}: {
  params: { nim: string };
}) {
  return (
    <SiteChrome cleanBackground>
      <AdminDetailClient adminNim={params.nim} />
    </SiteChrome>
  );
}
