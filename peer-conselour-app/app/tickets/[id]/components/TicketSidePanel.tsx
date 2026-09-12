import Link from "next/link";
import { memo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatLongDate, formatLongDateTime } from "../../../_portal/format";
import { getTicketCreatedAt, getUserDisplayName } from "../../../_portal/types";
import { STUDENT_CLOSURE_MESSAGE, resolutionReasonLabel } from "./resolution";
import type { TicketDetail, TicketViewMode } from "./types";

type TicketSidePanelProps = {
  ticket: TicketDetail;
  viewer: TicketViewMode;
  onRequestStatusChange: () => void;
  onRequestNewCounseling: () => void;
};

export const TicketSidePanel = memo(function TicketSidePanel({
  ticket,
  viewer,
  onRequestStatusChange,
  onRequestNewCounseling,
}: TicketSidePanelProps) {
  // Panel "Detail Layanan" bisa dilipat di mobile; pada >= 768px CSS selalu
  // menampilkannya sehingga tampilan tablet & desktop tidak berubah.
  const [isSideOpen, setIsSideOpen] = useState(false);

  const isAdminView = viewer === "admin";
  const isSessionCompleted = ticket.status === "resolved";
  // Hanya admin yang berwenang membuka kembali (reopen) tiket yang sudah selesai
  const canReopenSession = isAdminView && isSessionCompleted;
  const student = ticket.student;

  const counselingMode = ticket.service_type === "tatap_muka" ? "Konseling Tatap Muka" : "Konseling Online";
  const counselingStage = ticket.tahap_konseling ? `Konseling ${ticket.tahap_konseling}` : "Konseling Pertama";
  // Legacy tickets predate this question and keep NULL, rendered as "-".
  const psychologistHistory =
    ticket.has_psychologist_exp === true
      ? "Pernah"
      : ticket.has_psychologist_exp === false
        ? "Belum Pernah"
        : "-";

  const completePrompt = isAdminView
    ? "Apakah tiket ini sudah selesai ditangani?"
    : "Apakah kamu mau mengakhiri sesi konseling ini?";
  const sideActionPrompt = canReopenSession
    ? "Sesi ini sudah ditandai selesai. Perlu melanjutkan percakapan konseling?"
    : completePrompt;
  const sideActionLabel = isSessionCompleted
    ? "Buka Kembali Tiket"
    : isAdminView
      ? "Selesai"
      : "Akhiri Sesi Konseling";

  // Ringkasan hasil penanganan untuk sidebar admin. Tiket resolved lama
  // (resolution_type NULL) dianggap tertangani, sama seperti statistik dashboard.
  const isUnhandledResolution = ticket.resolution_type === "tidak_tertangani";
  const isStudentSelfResolved = ticket.resolution_type === "selesai_mandiri_mahasiswa";
  const studentStudyProgram = [student?.faculty, student?.department].filter(Boolean).join(" — ");

  return (
    <aside className={`ticket-chat-side${isSideOpen ? " is-open" : ""}`}>
      <div className="ticket-chat-side-head">
        <h2>Detail Layanan</h2>
        <button
          type="button"
          className="ticket-chat-side-toggle"
          aria-expanded={isSideOpen}
          aria-controls="ticket-side-info"
          aria-label={isSideOpen ? "Sembunyikan detail layanan" : "Tampilkan detail layanan"}
          onClick={() => setIsSideOpen((open) => !open)}
        >
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="ticket-side-info" id="ticket-side-info">
        <div className="ticket-side-row">
          <span>Jenis Layanan</span>
          <strong>{counselingMode}</strong>
        </div>
        <div className="ticket-side-row">
          <span>Tahap Konseling</span>
          <strong>{counselingStage}</strong>
        </div>
        <div className="ticket-side-row">
          <span>Topik Konseling</span>
          <strong>{ticket.category}</strong>
        </div>
        <div className="ticket-side-row">
          <span>Riwayat Psikolog / Psikiater</span>
          <strong>{psychologistHistory}</strong>
        </div>
        <div className="ticket-side-row">
          <span>Dibuat</span>
          <strong>{formatLongDate(getTicketCreatedAt(ticket))}</strong>
        </div>
        {isAdminView ? (
          <>
            <div className="ticket-side-divider" />
            <p className="ticket-side-subtitle">Detail Mahasiswa</p>
            <div className="ticket-side-row">
              <span>Nama</span>
              <strong>{getUserDisplayName(student) || "-"}</strong>
            </div>
            <div className="ticket-side-row">
              <span>NIM</span>
              <strong>{student?.nim || "-"}</strong>
            </div>
            <div className="ticket-side-row">
              <span>Jenis Kelamin</span>
              <strong>{student?.gender || "-"}</strong>
            </div>
            <div className="ticket-side-row">
              <span>Fakultas & Jurusan</span>
              <strong>{studentStudyProgram || "-"}</strong>
            </div>
            {student?.id ? (
              <Link href={`/admin/students/${student.id}`} className="ticket-side-student-link">
                Lihat detail mahasiswa
              </Link>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Di luar .ticket-side-info supaya tombol "Tandai Selesai" /
          "Buka Kembali Konseling" tetap terjangkau saat panel dilipat. */}
      <div className="ticket-side-action">
        {isAdminView && isSessionCompleted ? (
          <div className="ticket-resolution-summary">
            <div className="ticket-resolution-summary-head">
              <span className="ticket-side-subtitle">Hasil Penanganan</span>
              <span className={`ticket-resolution-badge ${isUnhandledResolution ? "is-unhandled" : "is-handled"}`}>
                {isUnhandledResolution ? "Tidak Tertangani" : "Tertangani"}
              </span>
            </div>
            {isStudentSelfResolved ? (
              <div className="ticket-resolution-detail">
                <span>Ditutup Oleh</span>
                <strong>Mahasiswa (mengakhiri sesi sendiri)</strong>
              </div>
            ) : null}
            {isUnhandledResolution ? (
              <div className="ticket-resolution-detail">
                <span>Alasan Penutupan</span>
                <strong>{resolutionReasonLabel(ticket.resolution_reason)}</strong>
              </div>
            ) : null}
            {ticket.resolution_notes ? (
              <div className="ticket-resolution-detail">
                <span>Catatan Admin</span>
                <strong className="ticket-resolution-notes">{ticket.resolution_notes}</strong>
              </div>
            ) : null}
            <div className="ticket-resolution-detail">
              <span>Waktu Selesai</span>
              <strong>{formatLongDateTime(ticket.closed_at)}</strong>
            </div>
          </div>
        ) : null}

        {!isAdminView && isSessionCompleted ? (
          <div className="ticket-closure-note">
            <span className="ticket-resolution-badge is-handled">Selesai</span>
            <p>{STUDENT_CLOSURE_MESSAGE}</p>
            <button type="button" className="button button-primary ticket-finish-button" onClick={onRequestNewCounseling}>
              Ajukan Konseling Baru
            </button>
          </div>
        ) : (
          <>
            <p>{sideActionPrompt}</p>
            <button
              type="button"
              className={`button ticket-finish-button ${
                canReopenSession ? "button-secondary ticket-reopen-button" : "button-primary"
              }`}
              onClick={onRequestStatusChange}
            >
              {sideActionLabel}
            </button>
          </>
        )}
      </div>
    </aside>
  );
});
