"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, PencilLine, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth, AuthRole } from "../../../auth/auth-provider";
import { ticketStatusLabel } from "../../../tickets/mock-data";
import { api } from "@/utils/api";
import "../../../styles/account-ticket.css";


export default function AdminDetailClient({ adminNim }: { adminNim: string }) {
  const { user, adminAccounts, updateAdmin } = useAuth();
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<AuthRole>("admin");
  const [editIsActive, setEditIsActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [resetInfoMessage, setResetInfoMessage] = useState("");
  const [ticketPage, setTicketPage] = useState(1);
  const ticketsPerPage = 10;

  const [assignedTickets, setAssignedTickets] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const adminAccount = useMemo(
    () => adminAccounts.find((account) => account.nim === adminNim) ?? null,
    [adminAccounts, adminNim]
  );

  const superadminsCount = useMemo(
    () => adminAccounts.filter((a) => a.role === "superadmin").length,
    [adminAccounts]
  );

  const isSelf = useMemo(() => {
    return !!(user && adminAccount && user.email === adminAccount.email);
  }, [user, adminAccount]);
  const isLastSuperadmin = adminAccount?.role === "superadmin" && superadminsCount <= 1;

  useEffect(() => {
    async function loadData() {
      if (!adminAccount) return;
      try {
        setIsLoading(true);
        const counselorId = adminAccount.nim; // nim contains database numeric ID for admin
        const [ticketsData, studentsData] = await Promise.all([
          api.get(`/api/admin/tickets?counselor_id=${counselorId}`),
          api.get("/api/admin/students")
        ]);
        setAssignedTickets(ticketsData || []);
        setStudents(studentsData || []);
      } catch (err) {
        console.error("Gagal mengambil data detail admin:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [adminAccount]);

  const firstReplyTickets = assignedTickets;

  const paginatedTickets = useMemo(() => {
    const start = (ticketPage - 1) * ticketsPerPage;
    return firstReplyTickets.slice(start, start + ticketsPerPage);
  }, [firstReplyTickets, ticketPage]);

  const studentNameById = useMemo(
    () =>
      students.reduce<Record<string, string>>((acc, student) => {
        acc[student.id] = student.full_name || student.fullName;
        return acc;
      }, {}),
    [students]
  );

  useEffect(() => {
    if (!adminAccount) return;
    setEditName(adminAccount.fullName);
    setEditEmail(adminAccount.email ?? "");
  }, [adminAccount]);

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
          <h1>Detail Admin</h1>
          <p>Login sebagai superadmin untuk melihat detail admin.</p>
          <Link href="/" className="button button-primary">
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    );
  }

  if (user.role !== "superadmin") {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Akses Terbatas</h1>
          <p>Halaman ini hanya untuk superadmin layanan konseling.</p>
          <Link href="/admin/dashboard?tab=admins" className="button button-primary">
            Kembali ke Daftar Admin
          </Link>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="section site-width account-page">
        <div style={{ textAlign: "center", padding: "80px 0", color: "#fff" }}>
          <p>Memuat detail admin...</p>
        </div>
      </section>
    );
  }

  if (!adminAccount) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Admin tidak ditemukan</h1>
          <p>Data admin dengan NIM ini belum tersedia.</p>
          <Link href="/admin/dashboard" className="button button-primary">
            Kembali ke Daftar Admin
          </Link>
        </div>
      </section>
    );
  }

  const openEditModal = () => {
    setFormError("");
    setFormSuccess("");
    setResetInfoMessage("");
    setEditName(adminAccount.fullName);
    setEditEmail(adminAccount.email ?? "");
    setEditRole(adminAccount.role);
    setEditIsActive(adminAccount.isActive !== false);
    setIsEditModalOpen(true);
  };

  const submitEditAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLastSuperadmin && (!editIsActive || editRole === "admin")) {
      setFormError("Gagal: Harus ada minimal satu akun superadmin aktif di sistem.");
      setFormSuccess("");
      return;
    }
    if (isSelf && (!editIsActive || editRole === "admin")) {
      setFormError("Gagal: Anda tidak dapat menonaktifkan atau menurunkan role Anda sendiri.");
      setFormSuccess("");
      return;
    }

    const result = await updateAdmin({
      nim: adminAccount.nim,
      fullName: editName,
      email: editEmail,
      role: editRole,
      isActive: editIsActive,
    });
    if (!result.ok) {
      setFormError(result.message ?? "Gagal memperbarui data admin.");
      setFormSuccess("");
      return;
    }

    setFormSuccess(result.message ?? "Data admin berhasil diperbarui.");
    setFormError("");
    setIsEditModalOpen(false);
  };

  return (
    <section className="section site-width account-page">
      <div className="ticket-detail-top">
        <Link href="/admin/dashboard?tab=admins" className="ticket-back-link">
          <ArrowLeft size={16} />
          Kembali ke Daftar Admin
        </Link>
      </div>

      <article className="admin-profile-card admin-admin-detail-head">
        <div className="admin-profile-identity">
          <div className="admin-profile-identity-top">
            <h2>{adminAccount.fullName}</h2>
            <button
              type="button"
              className="admin-admin-edit-trigger"
              onClick={openEditModal}
              aria-label="Edit admin"
            >
              <PencilLine size={16} />
            </button>
          </div>
          <div className="admin-admin-inline-meta">
            <p>{adminAccount.role === "superadmin" ? "Superadmin" : "Admin"}</p>
            <span className="admin-admin-inline-separator" aria-hidden="true">
              •
            </span>
            <p>{adminAccount.email ?? "-"}</p>
          </div>
        </div>
        <div className="admin-admin-detail-side">
          <div className="admin-profile-summary">
            <span>Balasan Pertama</span>
            <strong>{firstReplyTickets.length}</strong>
          </div>
        </div>
      </article>
      {formError ? <p className="admin-form-error">{formError}</p> : null}
      {formSuccess ? <p className="admin-form-success">{formSuccess}</p> : null}

      <div
        style={{
          maxHeight: "330px", // Fits exactly 3 cards + gaps
          overflowY: "auto",
          paddingRight: "6px",
          display: "block"
        }}
      >
        <div className="admin-scroll-list">
          {paginatedTickets.map((ticket) => (
            <article key={ticket.id} className="my-counseling-card my-counseling-card-ticket">
              <div className={`my-counseling-card-top ticket-top-${ticket.status}`}>
                <div className="my-counseling-ticket-head">
                  <span className={`ticket-status ticket-status-${ticket.status}`}>
                    {ticketStatusLabel[ticket.status as import("../../../tickets/mock-data").TicketStatus] ?? ticket.status}
                  </span>
                </div>
              </div>

              <div className="my-counseling-content my-counseling-content-ticket">
                <h2>{ticket.title}</h2>
                <p>
                  {ticket.created_at || ticket.createdAt
                    ? new Date(ticket.created_at || ticket.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"} • {studentNameById[ticket.student_id || ticket.studentId] ?? "Mahasiswa"}
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
      </div>

      {/* Pagination Controller Admin Detail Tickets */}
      {firstReplyTickets.length > ticketsPerPage && (
        <div 
          className="admin-pagination-bar" 
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid rgba(255,255,255,0.08)"
          }}
        >
          <button
            type="button"
            className="button button-secondary"
            disabled={ticketPage === 1}
            onClick={() => setTicketPage(p => Math.max(1, p - 1))}
            style={{ minHeight: "36px", padding: "0 12px", fontSize: "13px" }}
          >
            Prev
          </button>

          {(() => {
            const totalPages = Math.ceil(firstReplyTickets.length / ticketsPerPage);
            const pages: (number | string)[] = [];
            
            if (totalPages <= 5) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
              pages.push(1);
              if (ticketPage > 3) {
                pages.push("...");
              }
              
              const startPage = Math.max(2, ticketPage - 1);
              const endPage = Math.min(totalPages - 1, ticketPage + 1);
              
              for (let i = startPage; i <= endPage; i++) {
                if (!pages.includes(i)) pages.push(i);
              }
              
              if (ticketPage < totalPages - 2) {
                pages.push("...");
              }
              if (!pages.includes(totalPages)) pages.push(totalPages);
            }

            return pages.map((page, idx) => {
              if (page === "...") {
                return <span key={`dots-${idx}`} style={{ opacity: 0.5, color: "var(--text-secondary)" }}>...</span>;
              }
              return (
                <button
                  key={`page-${page}`}
                  type="button"
                  className={ticketPage === page ? "button button-primary" : "button button-secondary"}
                  onClick={() => setTicketPage(page as number)}
                  style={{
                    minHeight: "36px",
                    width: "36px",
                    padding: 0,
                    fontSize: "13px",
                    borderRadius: "50%",
                    background: ticketPage === page ? "var(--blue)" : "transparent",
                    borderColor: ticketPage === page ? "var(--blue)" : "transparent",
                    color: ticketPage === page ? "#fff" : "var(--blue-dark)"
                  }}
                >
                  {page}
                </button>
              );
            });
          })()}

          <button
            type="button"
            className="button button-secondary"
            disabled={ticketPage === Math.ceil(firstReplyTickets.length / ticketsPerPage)}
            onClick={() => setTicketPage(p => Math.min(Math.ceil(firstReplyTickets.length / ticketsPerPage), p + 1))}
            style={{ minHeight: "36px", padding: "0 12px", fontSize: "13px" }}
          >
            Next
          </button>
        </div>
      )}

      {firstReplyTickets.length === 0 ? (
        <div className="my-counseling-empty">
          <h3>Belum ada tiket sebagai pembalas pertama.</h3>
          <p>Data akan tampil setelah admin ini menjadi pembalas pertama di tiket.</p>
        </div>
      ) : null}

      {isMounted && isEditModalOpen ? createPortal(
        <div
          className="admin-add-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Edit data admin"
        >
          <button
            type="button"
            className="admin-add-backdrop"
            aria-label="Tutup pop up edit admin"
            onClick={() => setIsEditModalOpen(false)}
          />
          <article className="admin-add-panel">
            <header className="admin-add-header">
              <h3>Edit Admin</h3>
              <button
                type="button"
                className="admin-add-close"
                aria-label="Tutup"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <form className="admin-add-form" onSubmit={submitEditAdmin}>
              <label className="admin-add-field">
                <span>Nama Lengkap</span>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Nama admin"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  autoComplete="name"
                />
              </label>
              <label className="admin-add-field">
                <span>Email Admin</span>
                <input
                  type="email"
                  className="admin-search-input"
                  placeholder="admin@ub.ac.id"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  autoComplete="email"
                />
              </label>
              <label className="admin-add-field">
                <span>Role Staf</span>
                <select
                  className="admin-search-input"
                  value={editRole}
                  onChange={(event) => setEditRole(event.target.value as AuthRole)}
                  disabled={isSelf || isLastSuperadmin}
                >
                  <option value="admin">Admin / Konselor</option>
                  <option value="superadmin">Superadmin</option>
                </select>
                {!isSelf && isLastSuperadmin && (
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                    * Role tidak dapat diubah karena ini adalah satu-satunya akun Superadmin di sistem.
                  </span>
                )}
              </label>
              <label className="admin-add-field">
                <span>Status Akun</span>
                <select
                  className="admin-search-input"
                  value={editIsActive ? "active" : "inactive"}
                  onChange={(event) => setEditIsActive(event.target.value === "active")}
                  disabled={isSelf || isLastSuperadmin}
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif (Mahasiswa Biasa)</option>
                </select>
                {!isSelf && isLastSuperadmin && (
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                    * Akun tidak dapat dinonaktifkan karena ini adalah satu-satunya akun Superadmin aktif.
                  </span>
                )}
              </label>
              <div className="admin-add-form-actions admin-add-form-actions-inline" style={{ display: "flex", justifyContent: "flex-end", width: "100%", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Batal
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
