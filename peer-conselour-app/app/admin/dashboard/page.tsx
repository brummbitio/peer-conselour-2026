import { Suspense } from "react";
import { SiteChrome } from "../../components";
import AdminDashboardClient from "./AdminDashboardClient";

export default function AdminDashboardPage() {
  return (
    <SiteChrome cleanBackground>
      <Suspense
        fallback={
          <section className="section site-width account-page">
            <div style={{ textAlign: "center", padding: "120px 0", color: "#fff" }}>
              <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>Memuat dashboard admin...</p>
            </div>
          </section>
        }
      >
        <AdminDashboardClient />
      </Suspense>
    </SiteChrome>
  );
}

