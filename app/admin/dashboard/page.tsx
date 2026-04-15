import { SiteChrome } from "../../components";
import AdminDashboardClient from "./AdminDashboardClient";

export default function AdminDashboardPage() {
  return (
    <SiteChrome cleanBackground>
      <AdminDashboardClient />
    </SiteChrome>
  );
}
