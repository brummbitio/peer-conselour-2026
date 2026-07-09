"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../auth/auth-provider";
import { counselingBookings } from "../tickets/mock-data";

type TabMode = "active" | "history";

export default function MyCounselingClient() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabMode>("active");

  const filteredBookings = useMemo(
    () => counselingBookings.filter((booking) => booking.status === tab),
    [tab]
  );

  if (!user) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Konseling Saya</h1>
          <p>
            Kamu perlu login dulu untuk melihat jadwal konseling dan riwayat
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
        <p>Lihat sesi aktif dan riwayat pendampingan kamu di sini.</p>
      </div>

      <div className="my-counseling-layout">
        <aside className="my-counseling-tabs">
          <button
            type="button"
            className={tab === "active" ? "is-active" : ""}
            onClick={() => setTab("active")}
          >
            Konseling Aktif
          </button>
          <button
            type="button"
            className={tab === "history" ? "is-active" : ""}
            onClick={() => setTab("history")}
          >
            Riwayat Konseling
          </button>
        </aside>

        <div className="my-counseling-list">
          {filteredBookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/tickets/${booking.ticketId}`}
              className="my-counseling-card"
            >
              <div className="my-counseling-media">
                <img src={booking.image} alt={booking.title} />
              </div>
              <div className="my-counseling-content">
                <span className="my-counseling-kicker">{booking.mode}</span>
                <h2>{booking.title}</h2>
                <p>{booking.counselor}</p>
                <p>{booking.location}</p>
                <span>{booking.dateRange}</span>
              </div>
              <span className="my-counseling-arrow" aria-hidden="true">
                <ChevronRight size={20} />
              </span>
            </Link>
          ))}

          {filteredBookings.length === 0 ? (
            <article className="my-counseling-empty">
              <h3>Belum ada data pada kategori ini.</h3>
              <p>
                Mulai ticket baru dari menu Tiket Saya untuk menjadwalkan sesi
                konseling.
              </p>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
