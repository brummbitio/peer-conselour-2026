"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, SendHorizontal } from "lucide-react";
import { isAdminRole, useAuth } from "../../auth/auth-provider";
import {
  getMessagesByTicketId,
  getStudentById,
  getTicketById,
  TicketMessage,
  TicketStatus,
  ticketStatusLabel,
} from "../mock-data";

export default function TicketDetailClient({
  ticketId,
  mode = "student",
}: {
  ticketId: string;
  mode?: "student" | "admin";
}) {
  const { user } = useAuth();
  const isAdminView = mode === "admin";
  const ticket = useMemo(() => getTicketById(ticketId), [ticketId]);
  const student = useMemo(
    () => (ticket ? getStudentById(ticket.studentId) : undefined),
    [ticket]
  );
  const [draft, setDraft] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  const [isSessionCompleted, setIsSessionCompleted] = useState(
    ticket?.status === "resolved"
  );
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = useState(false);
  const [messages, setMessages] = useState<TicketMessage[]>(
    getMessagesByTicketId(ticketId)
  );

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    setIsSessionCompleted(ticket?.status === "resolved");
  }, [ticket?.id, ticket?.status]);

  useEffect(() => {
    if (!isCompleteConfirmOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCompleteConfirmOpen(false);
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isCompleteConfirmOpen]);

  if (!user) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Detail Tiket</h1>
          <p>Login dulu untuk melihat percakapan ticket kamu.</p>
          <Link href="/" className="button button-primary">
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    );
  }

  if (!ticket) {
    const fallbackHref = isAdminView ? "/admin/dashboard" : "/my-counseling";
    const fallbackLabel = isAdminView ? "Kembali ke Dashboard" : "Kembali ke Tiket Saya";
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Tiket tidak ditemukan</h1>
          <p>Sepertinya ID ticket yang kamu buka belum tersedia.</p>
          <Link href={fallbackHref} className="button button-primary">
            {fallbackLabel}
          </Link>
        </div>
      </section>
    );
  }

  if (isAdminView && !isAdminRole(user.role)) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Akses Terbatas</h1>
          <p>Halaman detail ini hanya untuk admin.</p>
          <Link href="/my-counseling" className="button button-primary">
            Kembali ke Konseling Saya
          </Link>
        </div>
      </section>
    );
  }

  if (!isAdminView && isAdminRole(user.role)) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Gunakan Dashboard Admin</h1>
          <p>Untuk melihat detail tiket, gunakan halaman admin.</p>
          <Link href="/admin/dashboard" className="button button-primary">
            Buka Dashboard
          </Link>
        </div>
      </section>
    );
  }

  const counselingModeByTicket: Record<string, "Konseling Tatap Muka" | "Konseling Online"> = {
    "tkt-001": "Konseling Tatap Muka",
    "tkt-002": "Konseling Online",
    "tkt-003": "Konseling Tatap Muka",
  };
  const counselingMode = counselingModeByTicket[ticket.id] ?? "Konseling Online";

  const sendMessage = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const now = new Date();
    const newMessage: TicketMessage = {
      id: `local-${now.getTime()}`,
      ticketId: ticket.id,
      sender: isAdminView ? "admin" : "mahasiswa",
      senderName: user.fullName,
      sentAt: now.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      body: trimmed,
    };
    setMessages((current) => [...current, newMessage]);
    setDraft("");
  };

  const ticketStatus: TicketStatus = isSessionCompleted ? "resolved" : ticket.status;
  const backHref = isAdminView ? "/admin/dashboard" : "/my-counseling";
  const backLabel = isAdminView ? "Kembali ke Dashboard" : "Kembali ke Tiket Saya";
  const completePrompt = isAdminView
    ? "Apakah tiket ini sudah selesai ditangani?"
    : "Apakah kamu mau menyelesaikan sesi konseling ini?";
  const confirmTitle = isAdminView
    ? "Tandai tiket ini selesai?"
    : "Selesaikan sesi konseling?";
  const confirmDescription = isAdminView
    ? "Setelah ditandai selesai, tiket akan dipindahkan ke riwayat tiket selesai."
    : "Setelah diselesaikan, status tiket akan berubah menjadi selesai. Kamu tetap bisa melihat riwayat chat.";
  const composerPlaceholder = isAdminView
    ? "Tulis balasan untuk mahasiswa..."
    : "Tulis pesan untuk konselor...";

  const openCompleteConfirm = () => {
    if (isSessionCompleted) return;
    setIsCompleteConfirmOpen(true);
  };

  const completeSession = () => {
    setIsSessionCompleted(true);
    setIsCompleteConfirmOpen(false);
  };

  return (
    <section className="section site-width account-page">
      <div className="ticket-detail-top">
        <Link href={backHref} className="ticket-back-link">
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
      </div>

      <div className="ticket-chat-layout">
        <div className="ticket-chat-main">
          <header className="ticket-chat-header">
            <p className="ticket-chat-id">Ticket ID: {ticket.code}</p>
            <div className={`ticket-status-banner ticket-status-banner-${ticketStatus}`}>
              <span className="ticket-status-banner-label">Status Tiket</span>
              <span className="ticket-status-banner-value">
                {ticketStatusLabel[ticketStatus]}
              </span>
            </div>
          </header>

          <div className="ticket-chat-subject">
            <h1>{ticket.title}</h1>
          </div>

          <div className="ticket-message-list" ref={messageListRef}>
            {messages.map((message) => {
              const isOwnMessage =
                (isAdminView && message.sender === "admin") ||
                (!isAdminView && message.sender === "mahasiswa");

              return (
                <article
                  key={message.id}
                  className={`ticket-message-bubble ${
                    isOwnMessage ? "ticket-message-self" : "ticket-message-other"
                  } ticket-message-${message.sender}`}
                >
                  <div className="ticket-message-head">
                    <strong>{message.senderName}</strong>
                    <span>{message.sentAt}</span>
                  </div>
                  <p>{message.body}</p>
                </article>
              );
            })}
          </div>

          <div className="ticket-composer">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={composerPlaceholder}
            />
            <button type="button" onClick={sendMessage} className="button button-primary">
              <SendHorizontal size={16} />
              Kirim
            </button>
          </div>
        </div>

        <aside className="ticket-chat-side">
          <h2>Detail Layanan</h2>
          <div className="ticket-side-info">
            <div className="ticket-side-row">
              <span>Jenis Layanan</span>
              <strong>{counselingMode}</strong>
            </div>
            <div className="ticket-side-row">
              <span>Topik Konseling</span>
              <strong>{ticket.category}</strong>
            </div>
            <div className="ticket-side-row">
              <span>Dibuat</span>
              <strong>{ticket.createdAt}</strong>
            </div>
            {isAdminView ? (
              <>
                <div className="ticket-side-divider" />
                <p className="ticket-side-subtitle">Detail Mahasiswa</p>
                <div className="ticket-side-row">
                  <span>Nama</span>
                  <strong>{student?.fullName ?? "-"}</strong>
                </div>
                <div className="ticket-side-row">
                  <span>Jenis Kelamin</span>
                  <strong>{student?.gender ?? "-"}</strong>
                </div>
                <div className="ticket-side-row">
                  <span>Fakultas & Jurusan</span>
                  <strong>
                    {student
                      ? `${student.faculty} — ${student.department}`
                      : "-"}
                  </strong>
                </div>
                {student ? (
                  <Link href={`/admin/students/${student.id}`} className="ticket-side-student-link">
                    Lihat detail mahasiswa
                  </Link>
                ) : null}
              </>
            ) : null}
            <div className="ticket-side-action">
              <p>{completePrompt}</p>
              <button
                type="button"
                className="button button-primary ticket-finish-button"
                onClick={openCompleteConfirm}
                disabled={isSessionCompleted}
              >
                {isSessionCompleted ? "Sesi Selesai" : "Selesai"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {isCompleteConfirmOpen ? (
        <div className="ticket-confirm-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Tutup konfirmasi"
            className="ticket-confirm-backdrop"
            onClick={() => setIsCompleteConfirmOpen(false)}
          />
          <div className="ticket-confirm-panel">
            <h3>{confirmTitle}</h3>
            <p>{confirmDescription}</p>
            <div className="ticket-confirm-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setIsCompleteConfirmOpen(false)}
              >
                Batal
              </button>
              <button type="button" className="button button-primary" onClick={completeSession}>
                Selesaikan Sesi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
