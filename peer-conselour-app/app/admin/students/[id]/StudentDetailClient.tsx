"use client";

import Link from "next/link";
import { History, KeyRound, PencilLine } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { isAdminRole, useAuth } from "../../../auth/auth-provider";
import { api } from "@/utils/api";
import { BackLink } from "../../../_portal/BackLink";
import { CardScrollList } from "../../../_portal/CardScrollList";
import { EmptyState } from "../../../_portal/EmptyState";
import { Pagination } from "../../../_portal/Pagination";
import { PortalLoader } from "../../../_portal/PortalLoader";
import { PortalModal } from "../../../_portal/PortalModal";
import { TicketListCard } from "../../../_portal/TicketListCard";
import { formatShortDate } from "../../../_portal/format";
import { PORTAL_BACK_TARGETS } from "../../../_portal/routes";
import { getTicketCreatedAt, getUserDisplayName } from "../../../_portal/types";
import type { ApiTicket, ApiUserSummary } from "../../../_portal/types";
import { usePagination } from "../../../_portal/usePagination";
import "../../../styles/account-ticket.css";
import "../../../styles/admin-dashboard.css";

type StudentDetailResponse = {
  profile?: ApiUserSummary | null;
  tickets?: ApiTicket[] | null;
};

export default function StudentDetailClient({ studentId }: { studentId: string }) {
  const { user, isReady } = useAuth();
  const isAdmin = !!user && isAdminRole(user.role);
  const [student, setStudent] = useState<ApiUserSummary | null>(null);
  const [studentTickets, setStudentTickets] = useState<ApiTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [resetInfoMessage, setResetInfoMessage] = useState("");

  const { page, totalPages, totalItems, pageSize, pageItems, setPage } = usePagination(studentTickets);

  useEffect(() => {
    // Data hanya diambil setelah sesi admin terverifikasi (hindari request 401/403).
    if (!isAdmin) return;
    const controller = new AbortController();
    setIsLoading(true);

    api
      .get(`/api/admin/students/${studentId}`, { signal: controller.signal })
      .then((data: StudentDetailResponse) => {
        const profile = data?.profile ?? null;
        const tickets = data?.tickets;
        setStudent(profile);
        setStudentTickets(Array.isArray(tickets) ? tickets : []);
        if (profile) {
          setStudentName(getUserDisplayName(profile));
          setStudentEmail(profile.email ?? "");
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Gagal memuat profil mahasiswa:", err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [studentId, isAdmin]);

  if (!isReady) {
    return <PortalLoader label="Memverifikasi Sesi..." />;
  }

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

  if (!isAdmin) {
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
    return <PortalLoader label="Memuat detail mahasiswa..." />;
  }

  if (!student) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Mahasiswa tidak ditemukan</h1>
          <p>Data mahasiswa dengan ID ini belum tersedia.</p>
          <Link href={PORTAL_BACK_TARGETS.adminStudents.href} className="button button-primary">
            {PORTAL_BACK_TARGETS.adminStudents.label}
          </Link>
        </div>
      </section>
    );
  }

  const openEditModal = () => {
    setFormSuccess("");
    setResetInfoMessage("");
    setStudentName(getUserDisplayName(student));
    setStudentEmail(student.email ?? "");
    setStudentPassword("");
    setIsEditModalOpen(true);
  };

  const submitEditStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSuccess("UI dummy: data mahasiswa berhasil diperbarui di tampilan.");
    setIsEditModalOpen(false);
  };

  const studentAddress =
    student.address ||
    student.origin_region ||
    student.originRegion ||
    student.malang_address ||
    student.malangAddress ||
    "-";

  return (
    <section className="section site-width account-page">
      <BackLink {...PORTAL_BACK_TARGETS.adminStudents} />

      <article className="admin-student-detail-card">
        <header className="admin-student-detail-header">
          <div className="admin-profile-identity-top">
            <h1>{studentName || getUserDisplayName(student)}</h1>
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
            <strong>{student.gender || "-"}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Fakultas</span>
            <strong>{student.faculty || "-"}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Jurusan</span>
            <strong>{student.department || "-"}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Alamat Email</span>
            <strong>{studentEmail || student.email || "-"}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Nomor HP</span>
            <strong>{student.phone || "-"}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Alamat</span>
            <strong>{studentAddress}</strong>
          </div>
        </div>
      </article>

      <section className="student-detail-tickets-section" style={{ marginTop: "36px", display: "grid", gap: "16px" }}>
        <h2 style={{ fontSize: "1.5rem", margin: 0, color: "var(--text-primary)", maxWidth: "none" }}>
          Riwayat Tiket Konseling
        </h2>

        {studentTickets.length === 0 ? (
          <EmptyState
            icon={History}
            title="Belum ada riwayat tiket."
            description="Mahasiswa ini belum pernah membuat tiket konseling."
          />
        ) : (
          <div>
            <CardScrollList ariaLabel="Riwayat tiket konseling mahasiswa" resetKey={page}>
              {pageItems.map((ticket) => (
                <TicketListCard
                  key={ticket.id}
                  href={`/admin/tickets/${ticket.id}`}
                  code={ticket.code}
                  title={ticket.title}
                  subtitle={`${formatShortDate(getTicketCreatedAt(ticket))} • ${ticket.category}`}
                  status={ticket.status}
                  resolutionType={ticket.resolution_type}
                  viewer="admin"
                />
              ))}
            </CardScrollList>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              ariaLabel="Navigasi halaman riwayat tiket"
            />
          </div>
        )}
      </section>

      <PortalModal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Mahasiswa">
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
      </PortalModal>
    </section>
  );
}
