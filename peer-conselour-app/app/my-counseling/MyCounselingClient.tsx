"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, History, MessageCircleHeart, X } from "lucide-react";
import StartCounselingModal from "../StartCounselingModal";
import { isAdminRole, useAuth } from "../auth/auth-provider";
import { api } from "@/utils/api";
import { CardScrollList } from "../_portal/CardScrollList";
import { createMemoryCache } from "../_portal/dataCache";
import { EmptyState } from "../_portal/EmptyState";
import { Pagination } from "../_portal/Pagination";
import { PortalLoader, TicketCardSkeleton } from "../_portal/PortalLoader";
import { PortalModal } from "../_portal/PortalModal";
import { TicketListCard } from "../_portal/TicketListCard";
import { formatShortDate } from "../_portal/format";
import { FACULTY_OPTIONS, GENDER_OPTIONS, normalizeFaculty } from "../_portal/profileOptions";
import { getTicketCreatedAt } from "../_portal/types";
import type { ApiTicket } from "../_portal/types";
import { usePagination } from "../_portal/usePagination";
import "../styles/account-ticket.css";
import "../styles/admin-dashboard.css";


type TabMode = "active" | "history" | "profile";
type ProfileDropdown = "gender" | "faculty" | null;
type ProfileToast = {
  kind: "success" | "error";
  message: string;
};

// Daftar tiket terakhir disimpan di memori tab: kembali dari detail tiket
// langsung menampilkan list tanpa skeleton, lalu diperbarui senyap di latar.
const studentTicketsCache = createMemoryCache<ApiTicket[]>();

export default function MyCounselingClient() {
  const { user, isReady, updateStudentProfile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabMode>("active");
  const ticketsCacheKey = user && !isAdminRole(user.role) ? `student:${user.nim || user.email || ""}` : null;
  const [liveTickets, setLiveTickets] = useState<ApiTicket[]>(
    () => (ticketsCacheKey ? studentTicketsCache.get(ticketsCacheKey) : null) ?? []
  );
  const [isLoading, setIsLoading] = useState(
    () => !(ticketsCacheKey && studentTicketsCache.get(ticketsCacheKey))
  );

  const [isCounselingModalOpen, setIsCounselingModalOpen] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!ticketsCacheKey) return;
    try {
      const data = await api.get("/api/tickets");
      const tickets: ApiTicket[] = Array.isArray(data) ? data : [];
      studentTicketsCache.set(ticketsCacheKey, tickets);
      setLiveTickets(tickets);
    } catch (err) {
      console.error("Gagal memuat tiket:", err);
    } finally {
      setIsLoading(false);
    }
  }, [ticketsCacheKey]);

  // Bergantung pada identitas user (string), bukan objek user: menyimpan profil
  // tidak lagi memicu pengambilan ulang daftar tiket.
  useEffect(() => {
    if (!ticketsCacheKey) return;
    const cached = studentTicketsCache.get(ticketsCacheKey);
    if (cached) {
      setLiveTickets(cached);
      setIsLoading(false);
    }
    void fetchTickets();
  }, [ticketsCacheKey, fetchTickets]);

  const [openDropdown, setOpenDropdown] = useState<ProfileDropdown>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileGender, setProfileGender] = useState("");
  const [profileFaculty, setProfileFaculty] = useState("");
  const [profileDepartment, setProfileDepartment] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileToast, setProfileToast] = useState<ProfileToast | null>(null);

  useEffect(() => {
    if (isAdminRole(user?.role)) {
      router.replace("/admin/dashboard");
    }
  }, [router, user?.role]);

  useEffect(() => {
    if (isReady && !user) {
      router.replace("/?login=true");
    }
  }, [isReady, user, router]);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.fullName);
    setProfileGender(user.gender ?? "");
    setProfileFaculty(normalizeFaculty(user.faculty));
    setProfileDepartment(user.department ?? "");
    setProfileEmail(user.email ?? "");
    setProfilePhone(user.phone ?? "");
  }, [
    user?.nim,
    user?.fullName,
    user?.gender,
    user?.faculty,
    user?.department,
    user?.email,
    user?.phone,
  ]);

  useEffect(() => {
    if (!isEditModalOpen) {
      setOpenDropdown(null);
    }
  }, [isEditModalOpen]);

  useEffect(() => {
    if (!isEditModalOpen || !openDropdown) return;

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".student-profile-dropdown")) {
        setOpenDropdown(null);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isEditModalOpen, openDropdown]);

  useEffect(() => {
    if (!profileToast) return;
    const timer = window.setTimeout(() => {
      setProfileToast(null);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [profileToast]);

  const filteredTickets = useMemo(() => {
    if (tab === "active") {
      return liveTickets.filter(
        (ticket) => ticket.status === "open" || ticket.status === "in_progress"
      );
    }
    if (tab === "history") {
      return liveTickets.filter((ticket) => ticket.status === "resolved");
    }
    return [];
  }, [tab, liveTickets]);

  const { page, totalPages, totalItems, pageSize, pageItems, setPage } = usePagination(filteredTickets);

  const selectTab = (nextTab: TabMode) => {
    setTab(nextTab);
    setPage(1);
  };

  const openCounselingModal = useCallback(() => setIsCounselingModalOpen(true), []);
  const closeCounselingModal = useCallback(() => setIsCounselingModalOpen(false), []);

  const submitProfileUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const result = await updateStudentProfile({
      nim: user.nim,
      fullName: profileName,
      gender: profileGender,
      faculty: profileFaculty,
      department: profileDepartment,
      email: profileEmail,
      phone: profilePhone,
      password: profilePassword,
    });

    if (!result.ok) {
      setProfileToast({
        kind: "error",
        message: result.message ?? "Profil belum berhasil diperbarui.",
      });
      return;
    }

    setProfileToast({
      kind: "success",
      message: result.message ?? "Profil berhasil diperbarui.",
    });
    setProfilePassword("");
    setIsEditModalOpen(false);
  };

  if (!isReady) {
    return <PortalLoader label="Memverifikasi Sesi..." />;
  }

  if (!user) {
    return <PortalLoader label="Mengalihkan ke Beranda..." />;
  }

  const isProfileIncomplete = !!(user && (!user.phone || !user.gender || !user.faculty || !user.department));

  const renderTicketArea = () => {
    if (isLoading) {
      return <TicketCardSkeleton />;
    }

    if (filteredTickets.length === 0) {
      if (liveTickets.length === 0) {
        return (
          <EmptyState
            icon={MessageCircleHeart}
            title="Kamu belum pernah konseling"
            description="Belum ada tiket konseling. Yuk mulai dengan membuat tiket konseling baru."
            action={
              <button type="button" className="button button-primary" onClick={openCounselingModal}>
                Buat Tiket Baru
              </button>
            }
          />
        );
      }

      return tab === "active" ? (
        <EmptyState
          icon={MessageCircleHeart}
          title="Tidak ada tiket aktif"
          description="Semua sesi konselingmu sudah selesai. Buat tiket baru kapan pun kamu butuh teman bercerita."
          action={
            <button type="button" className="button button-primary" onClick={openCounselingModal}>
              Buat Tiket Baru
            </button>
          }
        />
      ) : (
        <EmptyState
          icon={History}
          title="Belum ada riwayat tiket"
          description="Tiket yang sudah selesai akan tampil di sini."
        />
      );
    }

    return (
      <div>
        <CardScrollList
          ariaLabel={tab === "active" ? "Daftar tiket aktif" : "Riwayat tiket"}
          resetKey={`${tab}-${page}`}
        >
          {pageItems.map((ticket) => (
            <TicketListCard
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              code={ticket.code}
              title={ticket.title}
              subtitle={`${formatShortDate(getTicketCreatedAt(ticket))} • ${ticket.category}`}
              status={ticket.status}
              viewer="student"
            />
          ))}
        </CardScrollList>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          ariaLabel="Navigasi halaman tiket saya"
        />
      </div>
    );
  };

  return (
    <section className="section site-width account-page">
      <div className="account-heading">
        <h1>Konseling Saya</h1>
      </div>

      <div className="my-counseling-layout">
        <aside className="my-counseling-tabs" aria-label="Menu konseling saya">
          <button
            type="button"
            className={tab === "active" ? "is-active" : ""}
            aria-current={tab === "active" ? "page" : undefined}
            onClick={() => selectTab("active")}
          >
            Tiket Aktif
          </button>
          <button
            type="button"
            className={tab === "history" ? "is-active" : ""}
            aria-current={tab === "history" ? "page" : undefined}
            onClick={() => selectTab("history")}
          >
            Riwayat Tiket
          </button>
          <button
            type="button"
            className={tab === "profile" ? "is-active" : ""}
            aria-current={tab === "profile" ? "page" : undefined}
            onClick={() => selectTab("profile")}
          >
            Profil Saya
          </button>
        </aside>

        <div className="my-counseling-list">
          {tab === "profile" ? (
            <article className="admin-student-detail-card">
              <header className="admin-student-detail-header">
                <div className="admin-profile-identity-top">
                  <h1>{user.fullName}</h1>
                </div>
                <span className="admin-student-detail-nim">{user.nim}</span>
              </header>

              <div className="admin-student-detail-grid">
                <div className="admin-student-detail-row">
                  <span>Jenis Kelamin</span>
                  <strong>{user.gender || "-"}</strong>
                </div>
                <div className="admin-student-detail-row">
                  <span>Fakultas</span>
                  <strong>{user.faculty || "-"}</strong>
                </div>
                <div className="admin-student-detail-row">
                  <span>Jurusan</span>
                  <strong>{user.department || "-"}</strong>
                </div>
                <div className="admin-student-detail-row">
                  <span>Alamat Email</span>
                  <strong>{user.email || "-"}</strong>
                </div>
                <div className="admin-student-detail-row">
                  <span>Nomor HP</span>
                  <strong>{user.phone || "-"}</strong>
                </div>
                <div className="admin-student-detail-row">
                  <span>Alamat</span>
                  <strong>{user.address || "-"}</strong>
                </div>
              </div>
            </article>
          ) : (
            renderTicketArea()
          )}
        </div>
      </div>

      {profileToast ? (
        <div className="student-profile-toast-stack" role="status" aria-live="polite">
          <div className={`student-profile-toast student-profile-toast-${profileToast.kind}`}>
            <p>{profileToast.message}</p>
            <button
              type="button"
              className="student-profile-toast-close"
              aria-label="Tutup notifikasi"
              onClick={() => setProfileToast(null)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <PortalModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profil Saya"
        size="lg"
      >
        <form className="admin-add-form" onSubmit={submitProfileUpdate}>
          <div className="student-profile-form-row">
            <label className="admin-add-field">
              <span>Nama Lengkap</span>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Nama lengkap kamu"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="admin-add-field">
              <span>Jenis Kelamin</span>
              <div className="student-profile-dropdown">
                <button
                  type="button"
                  className={`student-profile-dropdown-trigger ${
                    openDropdown === "gender" ? "is-open" : ""
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === "gender"}
                  onClick={() =>
                    setOpenDropdown((current) =>
                      current === "gender" ? null : "gender"
                    )
                  }
                >
                  <span className={profileGender ? "" : "is-placeholder"}>
                    {profileGender || "Pilih jenis kelamin"}
                  </span>
                  <ChevronDown size={16} />
                </button>
                {openDropdown === "gender" ? (
                  <div
                    className="student-profile-dropdown-menu"
                    role="listbox"
                    aria-label="Pilihan jenis kelamin"
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`student-profile-dropdown-option ${
                          profileGender === option ? "is-active" : ""
                        }`}
                        onClick={() => {
                          setProfileGender(option);
                          setOpenDropdown(null);
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </label>
          </div>
          <div className="student-profile-form-row">
            <label className="admin-add-field">
              <span>Fakultas</span>
              <div className="student-profile-dropdown">
                <button
                  type="button"
                  className={`student-profile-dropdown-trigger ${
                    openDropdown === "faculty" ? "is-open" : ""
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === "faculty"}
                  onClick={() =>
                    setOpenDropdown((current) =>
                      current === "faculty" ? null : "faculty"
                    )
                  }
                >
                  <span className={profileFaculty ? "" : "is-placeholder"}>
                    {profileFaculty || "Pilih fakultas"}
                  </span>
                  <ChevronDown size={16} />
                </button>
                {openDropdown === "faculty" ? (
                  <div
                    className="student-profile-dropdown-menu"
                    role="listbox"
                    aria-label="Pilihan fakultas"
                  >
                    {FACULTY_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`student-profile-dropdown-option ${
                          profileFaculty === option ? "is-active" : ""
                        }`}
                        onClick={() => {
                          setProfileFaculty(option);
                          setOpenDropdown(null);
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </label>
            <label className="admin-add-field">
              <span>Jurusan</span>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Contoh: Teknik Informatika"
                value={profileDepartment}
                onChange={(event) => setProfileDepartment(event.target.value)}
              />
            </label>
          </div>
          <div className="student-profile-form-row">
            <label className="admin-add-field">
              <span>Email Mahasiswa</span>
              <input
                type="email"
                className="admin-search-input"
                placeholder="mahasiswa@ub.ac.id"
                value={profileEmail}
                onChange={(event) => setProfileEmail(event.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="admin-add-field">
              <span>Nomor HP</span>
              <input
                type="tel"
                className="admin-search-input"
                placeholder="08xxxxxxxxxx"
                value={profilePhone}
                onChange={(event) => setProfilePhone(event.target.value)}
                autoComplete="tel"
              />
            </label>
          </div>
          <label className="admin-add-field">
            <span>Password Baru (Opsional)</span>
            <input
              type="password"
              className="admin-search-input"
              placeholder="Minimal 8 karakter"
              value={profilePassword}
              onChange={(event) => setProfilePassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          <div className="admin-add-form-actions">
            <button type="submit" className="button button-primary">
              Simpan Perubahan
            </button>
          </div>
        </form>
      </PortalModal>

      {/* Wajib diisi sebelum memakai layanan: tanpa onClose, modal tidak bisa ditutup manual. */}
      <PortalModal
        open={isProfileIncomplete}
        title="Lengkapi Profil Anda"
        description="Sebelum menggunakan layanan konseling, harap lengkapi biodata kemahasiswaan Anda terlebih dahulu."
      >
        <form onSubmit={submitProfileUpdate} className="admin-add-form" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <label className="admin-add-field">
            <span>Nama Lengkap</span>
            <input
              type="text"
              value={profileName}
              onChange={(e) => {
                setProfileName(e.target.value);
                if (profileToast) setProfileToast(null);
              }}
              required
              className="admin-search-input"
              style={{ width: "100%" }}
            />
          </label>

          <div style={{ display: "flex", gap: "12px" }}>
            <label className="admin-add-field" style={{ flex: 1 }}>
              <span>NIM</span>
              <input
                type="text"
                value={user.nim}
                disabled
                className="admin-search-input"
                style={{ width: "100%", opacity: 0.6, cursor: "not-allowed", backgroundColor: "#f3f4f6" }}
              />
            </label>

            <label className="admin-add-field" style={{ flex: 1.2 }}>
              <span>Email</span>
              <input
                type="text"
                value={user.email || ""}
                disabled
                className="admin-search-input"
                style={{ width: "100%", opacity: 0.6, cursor: "not-allowed", backgroundColor: "#f3f4f6" }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <label className="admin-add-field" style={{ flex: 1 }}>
              <span>Jenis Kelamin</span>
              <select
                value={profileGender}
                onChange={(e) => {
                  setProfileGender(e.target.value);
                  if (profileToast) setProfileToast(null);
                }}
                required
                className="admin-search-input"
                style={{ width: "100%" }}
              >
                <option value="">Pilih</option>
                {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>

            <label className="admin-add-field" style={{ flex: 1.5 }}>
              <span>Nomor HP / WhatsApp</span>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => {
                  setProfilePhone(e.target.value);
                  if (profileToast) setProfileToast(null);
                }}
                required
                placeholder="0812..."
                className="admin-search-input"
                style={{ width: "100%" }}
              />
            </label>
          </div>

          <label className="admin-add-field">
            <span>Fakultas</span>
            <select
              value={profileFaculty}
              onChange={(e) => {
                setProfileFaculty(e.target.value);
                if (profileToast) setProfileToast(null);
              }}
              required
              className="admin-search-input"
              style={{ width: "100%" }}
            >
              <option value="">Pilih Fakultas</option>
              {FACULTY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>

          <label className="admin-add-field">
            <span>Program Studi / Jurusan</span>
            <input
              type="text"
              value={profileDepartment}
              onChange={(e) => {
                setProfileDepartment(e.target.value);
                if (profileToast) setProfileToast(null);
              }}
              required
              placeholder="Teknik Informatika"
              className="admin-search-input"
              style={{ width: "100%" }}
            />
          </label>

          {profileToast?.kind === "error" && (
            <p className="ub-modal-error" role="alert">{profileToast.message}</p>
          )}

          <button type="submit" className="button button-primary" style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}>
            Simpan Profil
          </button>
        </form>
      </PortalModal>

      <StartCounselingModal
        open={isCounselingModalOpen}
        onClose={closeCounselingModal}
        onSuccess={fetchTickets}
      />
    </section>
  );
}
