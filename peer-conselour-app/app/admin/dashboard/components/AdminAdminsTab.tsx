"use client";

import Link from "next/link";
import { memo, useMemo, useState } from "react";
import { ChevronRight, Plus, SearchX, ShieldCheck } from "lucide-react";
import type { AuthRole, AuthUser } from "../../../auth/auth-provider";
import { CardScrollList } from "../../../_portal/CardScrollList";
import { EmptyState } from "../../../_portal/EmptyState";
import { Pagination } from "../../../_portal/Pagination";
import { usePagination } from "../../../_portal/usePagination";
import { AddAdminModal } from "./AddAdminModal";

interface AdminAdminsTabProps {
  adminAccounts: AuthUser[];
  isSuperadmin: boolean;
  createAdmin: (data: { email: string; role: AuthRole }) => Promise<{ ok: boolean; message?: string }>;
}

const getRoleLabel = (role: string) => {
  if (role === "superadmin") return "Superadmin";
  if (role === "admin") return "Admin";
  return "Mahasiswa";
};

const AdminAccountCard = memo(function AdminAccountCard({ account }: { account: AuthUser }) {
  return (
    <article className="admin-admin-card">
      <div className="admin-admin-card-main">
        <h2>{account.fullName}</h2>
        <div className="admin-admin-card-meta">
          <span className="admin-admin-card-email">{account.email ?? "-"}</span>
          <span className="admin-admin-card-role">
            {getRoleLabel(account.role)}
            {account.isActive === false && (
              <span style={{ marginLeft: "8px", padding: "2px 6px", borderRadius: "6px", backgroundColor: "rgba(220, 38, 38, 0.12)", color: "#ef4444", fontSize: "10px", fontWeight: 700 }}>
                Nonaktif
              </span>
            )}
          </span>
        </div>
      </div>
      <Link
        href={`/admin/admins/${account.nim}`}
        className="my-counseling-arrow-link admin-admin-arrow-link"
        aria-label={`Buka detail admin ${account.fullName}`}
      >
        <span className="my-counseling-arrow" aria-hidden="true">
          <ChevronRight size={20} />
        </span>
      </Link>
    </article>
  );
});

export function AdminAdminsTab({ adminAccounts, isSuperadmin, createAdmin }: AdminAdminsTabProps) {
  const [adminQuery, setAdminQuery] = useState("");
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [adminFormError, setAdminFormError] = useState("");
  const [adminFormMessage, setAdminFormMessage] = useState("");

  const filteredAdminAccounts = useMemo(() => {
    const query = adminQuery.toLowerCase().trim();
    if (!query) return adminAccounts;
    return adminAccounts.filter(
      (account) =>
        (account.fullName || "").toLowerCase().includes(query) ||
        (account.email || "").toLowerCase().includes(query)
    );
  }, [adminAccounts, adminQuery]);

  const { page, totalPages, totalItems, pageSize, pageItems, setPage } = usePagination(filteredAdminAccounts);

  return (
    <>
      <div className="admin-tab-tools admin-tab-tools-admins">
        <input
          type="search"
          className="admin-search-input"
          placeholder="Cari nama atau email admin..."
          aria-label="Cari admin"
          value={adminQuery}
          onChange={(event) => {
            setAdminQuery(event.target.value);
            setPage(1);
          }}
        />
        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            setIsAddAdminModalOpen(true);
            setAdminFormError("");
            setAdminFormMessage("");
          }}
        >
          <Plus size={16} />
          Tambah Admin
        </button>
      </div>
      {adminFormError ? <p className="admin-form-error">{adminFormError}</p> : null}
      {adminFormMessage ? <p className="admin-form-success">{adminFormMessage}</p> : null}

      {filteredAdminAccounts.length === 0 ? (
        adminAccounts.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Belum ada akun admin." description="Tambahkan admin baru untuk mulai mengelola layanan." />
        ) : (
          <EmptyState icon={SearchX} title="Admin tidak ditemukan." description="Coba kata kunci lain untuk mencari admin." />
        )
      ) : (
        <>
          <CardScrollList ariaLabel="Daftar admin" resetKey={page}>
            {pageItems.map((account) => (
              <AdminAccountCard key={account.nim} account={account} />
            ))}
          </CardScrollList>
          {/* Pagination Controller Admin */}
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            ariaLabel="Navigasi halaman daftar admin"
          />
        </>
      )}

      <AddAdminModal
        isOpen={isAddAdminModalOpen}
        onClose={() => setIsAddAdminModalOpen(false)}
        isSuperadmin={isSuperadmin}
        createAdmin={createAdmin}
        onSuccess={(msg) => {
          setAdminFormMessage(msg);
          setAdminFormError("");
        }}
        onError={(err) => {
          setAdminFormError(err);
          setAdminFormMessage("");
        }}
      />
    </>
  );
}
