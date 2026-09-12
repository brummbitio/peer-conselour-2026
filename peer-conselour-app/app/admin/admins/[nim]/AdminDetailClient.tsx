"use client";

import Link from "next/link";
import { MessageSquareReply, PencilLine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../../auth/auth-provider";
import type { AuthRole } from "../../../auth/auth-provider";
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
import type { ApiTicket } from "../../../_portal/types";
import { usePagination } from "../../../_portal/usePagination";
import "../../../styles/account-ticket.css";
import "../../../styles/admin-dashboard.css";

const hintStyle = { fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" } as const;

export default function AdminDetailClient({ adminNim }: { adminNim: string }) {
  const { user, isReady, adminAccounts, updateAdmin } = useAuth();
  const isSuperadmin = user?.role === "superadmin";
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<AuthRole>("admin");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [assignedTickets, setAssignedTickets] = useState<ApiTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const adminAccount = useMemo(
    () => adminAccounts.find((account) => account.nim === adminNim) ?? null,
    [adminAccounts, adminNim]
  );

  const superadminsCount = useMemo(
    () => adminAccounts.filter((a) => a.role === "superadmin").length,
    [adminAccounts]
  );

  const isSelf = !!(user && adminAccount && user.email === adminAccount.email);
  const isLastSuperadmin = adminAccount?.role === "superadmin" && superadminsCount <= 1;
  // nim contains database numeric ID for admin
  const counselorId = adminAccount?.nim ?? null;

  const { page, totalPages, totalItems, pageSize, pageItems, setPage } = usePagination(assignedTickets);

  // Bergantung pada ID (string), bukan objek akun: memperbarui data admin tidak
  // lagi memicu pengambilan ulang tiket beserta layar loading penuh.
  useEffect(() => {
    if (!isSuperadmin || !counselorId) return;
    const controller = new AbortController();
    setIsLoading(true);

    // Nama mahasiswa sudah ikut di-preload pada setiap tiket (ticket.student),
    // jadi daftar seluruh mahasiswa tidak perlu diunduh di halaman ini.
    api
      .get(`/api/admin/tickets?counselor_id=${encodeURIComponent(counselorId)}`, { signal: controller.signal })
      .then((ticketsData: ApiTicket[] | null) => {
        setAssignedTickets(Array.isArray(ticketsData) ? ticketsData : []);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Gagal mengambil data detail admin:", err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [isSuperadmin, counselorId]);

  if (!isReady) {
    return <PortalLoader label="Memverifikasi Sesi..." />;
  }

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

  if (!isSuperadmin) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Akses Terbatas</h1>
          <p>Halaman ini hanya untuk superadmin layanan konseling.</p>
          <Link href={PORTAL_BACK_TARGETS.adminAdmins.href} className="button button-primary">
            {PORTAL_BACK_TARGETS.adminAdmins.label}
          </Link>
        </div>
      </section>
    );
  }

  // Daftar akun admin dimuat oleh AuthProvider. Selama masih kosong, akun
  // belum bisa dinyatakan "tidak ditemukan".
  if (!adminAccount && adminAccounts.length > 0) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Admin tidak ditemukan</h1>
          <p>Data admin dengan NIM ini belum tersedia.</p>
          <Link href={PORTAL_BACK_TARGETS.adminAdmins.href} className="button button-primary">
            {PORTAL_BACK_TARGETS.adminAdmins.label}
          </Link>
        </div>
      </section>
    );
  }

  if (!adminAccount || isLoading) {
    return <PortalLoader label="Memuat detail admin..." />;
  }

  const openEditModal = () => {
    setFormError("");
    setFormSuccess("");
    setEditName(adminAccount.fullName);
    setEditEmail(adminAccount.email ?? "");
    setEditRole(adminAccount.role);
    setEditIsActive(adminAccount.isActive !== false);
    setIsEditModalOpen(true);
  };

  const submitEditAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
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

    setIsSaving(true);
    const result = await updateAdmin({
      nim: adminAccount.nim,
      fullName: editName,
      email: editEmail,
      role: editRole,
      isActive: editIsActive,
    });
    setIsSaving(false);

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
      <BackLink {...PORTAL_BACK_TARGETS.adminAdmins} />

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
            <strong>{assignedTickets.length}</strong>
          </div>
        </div>
      </article>
      {formError ? <p className="admin-form-error">{formError}</p> : null}
      {formSuccess ? <p className="admin-form-success">{formSuccess}</p> : null}

      {assignedTickets.length === 0 ? (
        <EmptyState
          icon={MessageSquareReply}
          title="Belum ada tiket sebagai pembalas pertama."
          description="Data akan tampil setelah admin ini menjadi pembalas pertama di tiket."
        />
      ) : (
        <div>
          <CardScrollList ariaLabel="Tiket tugas admin" resetKey={page}>
            {pageItems.map((ticket) => (
              <TicketListCard
                key={ticket.id}
                href={`/admin/tickets/${ticket.id}`}
                code={ticket.code}
                title={ticket.title}
                subtitle={`${formatShortDate(getTicketCreatedAt(ticket))} • ${getUserDisplayName(ticket.student) || "Mahasiswa"}`}
                status={ticket.status}
                resolutionType={ticket.resolution_type}
                viewer="admin"
              />
            ))}
          </CardScrollList>
          {/* Pagination Controller Admin Detail Tickets */}
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            ariaLabel="Navigasi halaman tiket tugas admin"
          />
        </div>
      )}

      <PortalModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        closeDisabled={isSaving}
        title="Edit Admin"
      >
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
              <span style={hintStyle}>
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
              <span style={hintStyle}>
                * Akun tidak dapat dinonaktifkan karena ini adalah satu-satunya akun Superadmin aktif.
              </span>
            )}
          </label>
          <div className="ub-modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSaving}
            >
              Batal
            </button>
            <button type="submit" className="button button-primary" disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </PortalModal>
    </section>
  );
}
