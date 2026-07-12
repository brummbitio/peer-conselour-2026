"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, KeyRound, PencilLine, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isAdminRole, useAuth } from "../../../auth/auth-provider";
import { api } from "@/utils/api";
import "../../../styles/account-ticket.css";


export default function StudentDetailClient({ studentId }: { studentId: string }) {
  const { user } = useAuth();
  const [student, setStudent] = useState<any | null>(null);
  const [studentTickets, setStudentTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [resetInfoMessage, setResetInfoMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function loadStudent() {
      try {
        setIsLoading(true);
        const data = await api.get(`/api/admin/students/${studentId}`);
        setStudent(data.profile);
        setStudentTickets(data.tickets || []);
        if (data.profile) {
          setStudentName(data.profile.full_name || data.profile.fullName);
          setStudentEmail(data.profile.email);
        }
      } catch (err) {
        console.error("Gagal memuat profil mahasiswa:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStudent();
  }, [studentId]);

  useEffect(() => {
    if (!isEditModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isEditModalOpen]);

  if (!user) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Detail Mahasiswa</h1>
          <p>Login sebagai admin untuk melihat profil mahasiswa.</p>
          <Link href="/" className="button button-primary">
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    );
  }

  if (!isAdminRole(user.role)) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Akses Terbatas</h1>
          <p>Halaman ini hanya untuk admin layanan konseling.</p>
          <Link href="/my-counseling" className="button button-primary">
            Kembali ke Konseling Saya
          </Link>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="section site-width account-page">
        <div style={{ textAlign: "center", padding: "80px 0", color: "#fff" }}>
          <p>Memuat detail mahasiswa...</p>
        </div>
      </section>
    );
  }

  if (!student) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Mahasiswa tidak ditemukan</h1>
          <p>Data mahasiswa dengan ID ini belum tersedia.</p>
          <Link href="/admin/dashboard?tab=students" className="button button-primary">
            Kembali ke Daftar Mahasiswa
          </Link>
        </div>
      </section>
    );
  }

  const openEditModal = () => {
    setFormSuccess("");
    setResetInfoMessage("");
    setStudentName(student.full_name || student.fullName);
    setStudentEmail(student.email);
    setStudentPassword("");
    setIsEditModalOpen(true);
  };

  const submitEditStudent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSuccess("UI dummy: data mahasiswa berhasil diperbarui di tampilan.");
    setIsEditModalOpen(false);
  };

  return (
    <section className="section site-width account-page">
      <div className="ticket-detail-top">
        <Link href="/admin/dashboard?tab=students" className="ticket-back-link">
          <ArrowLeft size={16} />
          Kembali ke Daftar Mahasiswa
        </Link>
      </div>

      <article className="admin-student-detail-card">
        <header className="admin-student-detail-header">
          <div className="admin-profile-identity-top">
            <h1>{studentName || (student.full_name || student.fullName)}</h1>
            <button
              type="button"
              className="admin-admin-edit-trigger"
              onClick={openEditModal}
              aria-label="Edit mahasiswa"
            >
              <PencilLine size={16} />
            </button>
          </div>
          <span className="admin-student-detail-nim">{student.nim}</span>
        </header>
        {formSuccess ? <p className="admin-form-success">{formSuccess}</p> : null}

        <div className="admin-student-detail-grid">
          <div className="admin-student-detail-row">
            <span>Jenis Kelamin</span>
            <strong>{student.gender}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Fakultas</span>
            <strong>{student.faculty}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Jurusan</span>
            <strong>{student.department}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Alamat Email</span>
            <strong>{studentEmail || student.email}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Nomor HP</span>
            <strong>{student.phone || "-"}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Alamat</span>
            <strong>{student.address || student.origin_region || student.originRegion || student.malang_address || student.malangAddress || "-"}</strong>
          </div>
        </div>
      </article>

      <section className="student-detail-tickets-section" style={{ marginTop: "36px" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "var(--text-primary)", maxWidth: "none" }}>
          Riwayat Tiket Konseling
        </h2>
        
        {studentTickets.length === 0 ? (
          <div className="my-counseling-empty" style={{ padding: "32px 0", background: "rgba(255,255,255,0.02)", borderRadius: "16px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>Mahasiswa ini belum pernah membuat tiket konseling.</p>
          </div>
        ) : (
          <div className="admin-scroll-list" style={{ display: "grid", gap: "12px" }}>
            {studentTickets.map((ticket) => (
              <article key={ticket.id} className="my-counseling-card my-counseling-card-ticket">
                <div className={`my-counseling-card-top ticket-top-${ticket.status}`}>
                  <div className="my-counseling-ticket-head">
                    <span className={`ticket-status ticket-status-${ticket.status}`}>
                      {ticket.status === "open" ? "Menunggu Balasan" : ticket.status === "in_progress" ? "Sudah Dibalas" : "Selesai"}
                    </span>
                  </div>
                </div>
                <div className="my-counseling-content my-counseling-content-ticket">
                  <h2>{ticket.title}</h2>
                  <p>
                    {new Date(ticket.created_at || ticket.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })} • {ticket.category}
                  </p>
                </div>
                <Link
                  href={`/admin/tickets/${ticket.id}`}
                  className="my-counseling-arrow-link"
                  aria-label={`Buka tiket ${ticket.code}`}
                >
                  <span className="my-counseling-arrow" aria-hidden="true">
                    <ChevronRight size={20} />
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {isMounted && isEditModalOpen ? createPortal(
        <div
          className="admin-add-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Edit data mahasiswa"
        >
          <button
            type="button"
            className="admin-add-backdrop"
            aria-label="Tutup pop up edit mahasiswa"
            onClick={() => setIsEditModalOpen(false)}
          />
          <article className="admin-add-panel">
            <header className="admin-add-header">
              <h3>Edit Mahasiswa</h3>
              <button
                type="button"
                className="admin-add-close"
                aria-label="Tutup"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <form className="admin-add-form" onSubmit={submitEditStudent}>
              <label className="admin-add-field">
                <span>Nama Lengkap</span>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Nama mahasiswa"
                  value={studentName}
                  onChange={(event) => setStudentName(event.target.value)}
                  autoComplete="name"
                />
              </label>
              <label className="admin-add-field">
                <span>Email Mahasiswa</span>
                <input
                  type="email"
                  className="admin-search-input"
                  placeholder="mahasiswa@ub.ac.id"
                  value={studentEmail}
                  onChange={(event) => setStudentEmail(event.target.value)}
                  autoComplete="email"
                />
              </label>
              <label className="admin-add-field">
                <span>Password Manual (Opsional)</span>
                <input
                  type="password"
                  className="admin-search-input"
                  placeholder="Minimal 8 karakter"
                  value={studentPassword}
                  onChange={(event) => setStudentPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <div className="admin-add-form-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() =>
                    setResetInfoMessage(
                      "UI dummy: email reset password akan dikirim ke mahasiswa ini."
                    )
                  }
                >
                  <KeyRound size={16} />
                  Reset Password via Email
                </button>
                <button type="submit" className="button button-primary">
                  Simpan Perubahan
                </button>
              </div>
              {resetInfoMessage ? (
                <p className="admin-form-success admin-reset-inline-message">
                  {resetInfoMessage}
                </p>
              ) : null}
            </form>
          </article>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
