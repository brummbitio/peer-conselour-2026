"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "../auth/auth-provider";
import { ticketStatusLabel, tickets } from "./mock-data";

export default function TicketsClient() {
  const { user } = useAuth();

  if (!user) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Tiket Saya</h1>
          <p>
            Login dulu untuk melihat daftar ticket konseling dan percakapan
            dengan admin.
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
      <div className="ticket-page-header">
        <div>
          <h1>Tiket Saya</h1>
          <p>
            Pusat tiket pendampingan mahasiswa. Kamu bisa lanjut obrolan dengan
            konselor dari sini.
          </p>
        </div>
        <button type="button" className="button button-primary ticket-new-button">
          <Plus size={16} />
          Buat Tiket Baru
        </button>
      </div>

      <div className="ticket-list">
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="ticket-list-card">
            <div className="ticket-list-top">
              <span className="ticket-code">{ticket.code}</span>
              <span className={`ticket-status ticket-status-${ticket.status}`}>
                {ticketStatusLabel[ticket.status]}
              </span>
            </div>
            <h2>{ticket.title}</h2>
            <p>{ticket.summary}</p>
            <div className="ticket-list-meta">
              <span>{ticket.category}</span>
              <span>{ticket.counselor}</span>
              <span>Update: {ticket.lastReplyAt}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
