import { Suspense } from "react";
import { SiteChrome } from "../../components";
import { PortalLoader } from "../../_portal/PortalLoader";
import AdminDashboardClient from "./AdminDashboardClient";

export default function AdminDashboardPage() {
  return (
    <SiteChrome cleanBackground>
      <Suspense fallback={<PortalLoader label="Memuat dashboard admin..." />}>
        <AdminDashboardClient />
      </Suspense>
    </SiteChrome>
  );
}
