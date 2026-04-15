"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { isAdminRole, useAuth } from "../auth/auth-provider";
import { ticketStatusLabel, tickets } from "../tickets/mock-data";

type TabMode = "active" | "history";

export default function MyCounselingClient() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabMode>("active");

  useEffect(() => {
    if (isAdminRole(user?.role)) {
      router.replace("/admin/dashboard");
    }
  }, [router, user?.role]);

  const filteredTickets = useMemo(() => {
    if (tab === "active") {
      return tickets.filter(
        (ticket) => ticket.status === "open" || ticket.status === "in_progress"
      );
    }
    return tickets.filter((ticket) => ticket.status === "resolved");
  }, [tab]);

  if (!user) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Konseling Saya</h1>
          <p>
            Kamu perlu login dulu untuk melihat tiket aktif dan riwayat
            pendampingan.
          </p>
          <Link href="/" className="button button-primary">
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section site-width account-page">
      <div className="account-heading">
        <h1>Konseling Saya</h1>
      </div>

      <div className="my-counseling-layout">
        <aside className="my-counseling-tabs">
          <button
            type="button"
            className={tab === "active" ? "is-active" : ""}
            onClick={() => setTab("active")}
          >
            Tiket Aktif
          </button>
          <button
            type="button"
            className={tab === "history" ? "is-active" : ""}
            onClick={() => setTab("history")}
          >
            Riwayat Tiket
          </button>
        </aside>

        <div className="my-counseling-list">
          {filteredTickets.length === 0 ? (
            <article className="my-counseling-empty">
              <h3>Kamu belum pernah konseling</h3>
              <p>
                Belum ada tiket pada kategori ini. Yuk mulai dengan membuat
                tiket konseling baru.
              </p>
              <Link href="/book-session" className="button button-primary">
                Buat Tiket Baru
              </Link>
            </article>
          ) : (
            filteredTickets.map((ticket) => (
              <article key={ticket.id} className="my-counseling-card my-counseling-card-ticket">
                <div className={`my-counseling-card-top ticket-top-${ticket.status}`}>
                  <div className="my-counseling-ticket-head">
                    <span className={`ticket-status ticket-status-${ticket.status}`}>
                      {ticketStatusLabel[ticket.status]}
                    </span>
                  </div>
                </div>

                <div className="my-counseling-content my-counseling-content-ticket">
                  <h2>{ticket.title}</h2>
                  <p>{ticket.createdAt}</p>
                </div>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="my-counseling-arrow-link"
                  aria-label={`Buka tiket ${ticket.code}`}
                >
                  <span className="my-counseling-arrow" aria-hidden="true">
                    <ChevronRight size={20} />
                  </span>
                </Link>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
