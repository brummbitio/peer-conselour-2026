"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import StartCounselingModal from "../StartCounselingModal";
import { isAdminRole, useAuth } from "../auth/auth-provider";
import { ticketStatusLabel } from "../tickets/mock-data";
import { api } from "@/utils/api";
import "../styles/account-ticket.css";
import "../styles/admin-dashboard.css";


type TabMode = "active" | "history" | "profile";
type ProfileDropdown = "gender" | "faculty" | null;
type ProfileToast = {
  kind: "success" | "error";
  message: string;
};

const GENDER_OPTIONS = ["Laki-laki", "Perempuan"];

const FACULTY_OPTIONS = [
  "Fakultas Ilmu Komputer",
  "Fakultas Teknik",
  "Fakultas Kedokteran",
  "Fakultas Hukum",
  "Fakultas Ekonomi dan Bisnis",
  "Fakultas Ilmu Administrasi",
  "Fakultas Pertanian",
  "Fakultas Peternakan",
  "Fakultas Perikanan dan Ilmu Kelautan",
  "Fakultas Matematika dan Ilmu Pengetahuan Alam",
  "Fakultas Ilmu Sosial dan Ilmu Politik",
  "Fakultas Ilmu Budaya",
  "Fakultas Vokasi",
];

const normalizeFaculty = (fac: string | undefined): string => {
  if (!fac) return "";
  if (fac.startsWith("Fakultas ") || fac === "Program Pascasarjana") return fac;
  return "Fakultas " + fac;
};

export default function MyCounselingClient() {
  const { user, isReady, updateStudentProfile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabMode>("active");
  const [liveTickets, setLiveTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [isCounselingModalOpen, setIsCounselingModalOpen] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (user && !isAdminRole(user.role)) {
      try {
        setIsLoading(true);
        const data = await api.get("/api/tickets");
        setLiveTickets(data);
      } catch (err) {
        console.error("Gagal memuat tiket:", err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);
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
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
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

  const getStudentStatusLabel = (status: string) => {
    if (status === "resolved") return "Selesai";
    return status === "open" ? "Sudah Dibalas" : "Menunggu Balasan";
  };

  const getStudentStatusClass = (status: string) => {
    if (status === "resolved") return "resolved";
    return status === "open" ? "in_progress" : "open";
  };

  const openEditProfileModal = () => {
    if (!user) return;
    setProfileName(user.fullName);
    setProfileGender(user.gender ?? "");
    setProfileFaculty(normalizeFaculty(user.faculty));
    setProfileDepartment(user.department ?? "");
    setProfileEmail(user.email ?? "");
    setProfilePhone(user.phone ?? "");
    setProfilePassword("");
    setOpenDropdown(null);
    setIsEditModalOpen(true);
  };

  const submitProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
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
    return (
      <section className="section site-width account-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "450px", gap: "20px" }}>
        <div className="loader-progress-bar" style={{ width: "140px" }}>
          <div className="loader-progress-fill" />
        </div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>
          Memverifikasi Sesi...
        </span>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="section site-width account-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "450px", gap: "20px" }}>
        <div className="loader-progress-bar" style={{ width: "140px" }}>
          <div className="loader-progress-fill" />
        </div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>
          Mengalihkan ke Beranda...
        </span>
      </section>
    );
  }

  const isProfileIncomplete = !!(user && (!user.phone || !user.gender || !user.faculty || !user.department));

  return (
    <section className="section site-width account-page">
      <div className="account-heading">
        <h1>Konseling Saya</h1>
      </div>

      <div className="my-counseling-layout">
        <aside className="my-counseling-tabs">
          <button
            type="button"
            className={tab === "active" ? "is-active" : ""}
            onClick={() => setTab("active")}
          >
            Tiket Aktif
          </button>
          <button
            type="button"
            className={tab === "history" ? "is-active" : ""}
            onClick={() => setTab("history")}
          >
            Riwayat Tiket
          </button>
          <button
            type="button"
            className={tab === "profile" ? "is-active" : ""}
            onClick={() => setTab("profile")}
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
          ) : filteredTickets.length === 0 ? (
            <article className="my-counseling-empty">
              <h3>Kamu belum pernah konseling</h3>
              <p>
                Belum ada tiket pada kategori ini. Yuk mulai dengan membuat
                tiket konseling baru.
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setIsCounselingModalOpen(true)}
              >
                Buat Tiket Baru
              </button>
            </article>
          ) : (
            filteredTickets.map((ticket) => (
              <article key={ticket.id} className="my-counseling-card my-counseling-card-ticket">
                <div className={`my-counseling-card-top ticket-top-${getStudentStatusClass(ticket.status)}`}>
                  <div className="my-counseling-ticket-head">
                    <span className={`ticket-status ticket-status-${getStudentStatusClass(ticket.status)}`}>
                      {getStudentStatusLabel(ticket.status)}
                    </span>
                  </div>
                </div>

                <div className="my-counseling-content my-counseling-content-ticket">
                  <h2>{ticket.title}</h2>
                  <p>{ticket.createdAt}</p>
                </div>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="my-counseling-arrow-link"
                  aria-label={`Buka tiket ${ticket.code}`}
                >
                  <span className="my-counseling-arrow" aria-hidden="true">
                    <ChevronRight size={20} />
                  </span>
                </Link>
              </article>
            ))
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

      {isEditModalOpen ? (
        <div className="admin-add-modal" role="dialog" aria-modal="true" aria-label="Edit profil saya">
          <button
            type="button"
            className="admin-add-backdrop"
            aria-label="Tutup pop up edit profil"
            onClick={() => setIsEditModalOpen(false)}
          />
          <article className="admin-add-panel">
            <header className="admin-add-header">
              <h3>Edit Profil Saya</h3>
              <button
                type="button"
                className="admin-add-close"
                aria-label="Tutup"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
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
          </article>
        </div>
      ) : null}
      {isMounted && isProfileIncomplete ? createPortal(
        <div className="admin-add-modal" role="dialog" aria-modal="true" aria-label="Lengkapi profil Anda">
          <div className="admin-add-backdrop" style={{ background: "rgba(255, 255, 255, 0.4)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }} />
          <article className="admin-add-panel" style={{ width: "min(100%, 500px)", padding: "24px" }}>
            <header className="admin-add-header" style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Lengkapi Profil Anda</h3>
            </header>
            <p style={{ fontSize: "0.85rem", opacity: 0.8, color: "var(--text-secondary)", marginBottom: "16px", lineHeight: "1.4" }}>
              Sebelum menggunakan layanan konseling, harap lengkapi biodata kemahasiswaan Anda terlebih dahulu.
            </p>
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
                <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>{profileToast.message}</p>
              )}

              <button type="submit" className="button button-primary" style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}>
                Simpan Profil
              </button>
            </form>
          </article>
        </div>,
        document.body
      ) : null}
      {isMounted && (
        <StartCounselingModal
          open={isCounselingModalOpen}
          onClose={() => setIsCounselingModalOpen(false)}
          onSuccess={fetchTickets}
        />
      )}
    </section>
  );
}
