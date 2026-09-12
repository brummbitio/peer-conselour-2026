import Image from "next/image";
import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import type { AuthUser, useAuth } from "../auth/auth-provider";
import { FACULTY_OPTIONS, GENDER_OPTIONS, normalizeFaculty } from "../_portal/profileOptions";

type UpdateStudentProfile = ReturnType<typeof useAuth>["updateStudentProfile"];

interface ProfileCompletionFormProps {
  user: AuthUser;
  updateStudentProfile: UpdateStudentProfile;
  onClose: () => void;
  onCompleted: () => void;
}

export function ProfileCompletionForm({
  user,
  updateStudentProfile,
  onClose,
  onCompleted,
}: ProfileCompletionFormProps) {
  const [profileName, setProfileName] = useState("");
  const [profileGender, setProfileGender] = useState("");
  const [profileFaculty, setProfileFaculty] = useState("");
  const [profileDepartment, setProfileDepartment] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProfileName(user.fullName || "");
    setProfileGender(user.gender ?? "");
    // Data lama bisa tersimpan tanpa awalan "Fakultas" sehingga tidak cocok dengan opsi select
    setProfileFaculty(normalizeFaculty(user.faculty));
    setProfileDepartment(user.department ?? "");
    setProfilePhone(user.phone ?? "");
  }, [user]);

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    setFormError("");
    setIsSaving(true);
    const res = await updateStudentProfile({
      nim: user.nim,
      fullName: profileName,
      gender: profileGender,
      faculty: profileFaculty,
      department: profileDepartment,
      email: user.email || "",
      phone: profilePhone,
    });
    setIsSaving(false);

    if (!res.ok) {
      setFormError(res.message || "Gagal memperbarui profil.");
    } else {
      setFormError("");
      onCompleted();
    }
  };

  return (
    <section className="auth-page auth-page-modal">
      <div
        className="auth-card-modal start-counseling-card"
        style={{ textAlign: "left", maxHeight: "min(86vh, 760px)", overflowY: "auto" }}
      >
        <div className="auth-modal-header">
          <div className="auth-modal-brand">
            <Image
              src="/branding/logo-konseling.png"
              alt="Logo Layanan Konseling"
              width={42}
              height={42}
              className="auth-modal-brand-logo"
              priority
            />
            <span>Layanan Konseling</span>
          </div>
          <button
            type="button"
            className="auth-close"
            onClick={onClose}
            aria-label="Tutup pop up lengkapi profil"
          >
            <span />
            <span />
          </button>
        </div>

        <h2 className="auth-success-title" style={{ textAlign: "center", marginBottom: "8px" }}>Lengkapi Profil Anda</h2>
        <p className="auth-success-message" style={{ textAlign: "center", marginBottom: "20px" }}>
          Harap lengkapi biodata Anda sebelum mengajukan sesi konseling baru.
        </p>

        <form onSubmit={handleSaveProfile} style={{ display: "grid", gap: "14px" }}>
          <label className="auth-field">
            <span>Nama Lengkap</span>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
            <label className="auth-field">
              <span>Jenis Kelamin</span>
              <select value={profileGender} onChange={(e) => setProfileGender(e.target.value)} required>
                <option value="">Pilih</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-field">
              <span>Nomor HP</span>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                required
                placeholder="0812..."
                autoComplete="tel"
              />
            </label>
          </div>

          <label className="auth-field">
            <span>Fakultas</span>
            <select value={profileFaculty} onChange={(e) => setProfileFaculty(e.target.value)} required>
              <option value="">Pilih Fakultas</option>
              {FACULTY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="auth-field">
            <span>Jurusan</span>
            <input
              type="text"
              value={profileDepartment}
              onChange={(e) => setProfileDepartment(e.target.value)}
              required
              placeholder="Teknik Informatika"
            />
          </label>

          {formError ? (
            <p className="auth-field-inline-message" role="alert">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            className="button button-primary"
            disabled={isSaving}
            style={{ width: "100%", justifyContent: "center", marginTop: "4px" }}
          >
            {isSaving ? "Menyimpan..." : "Simpan & Lanjutkan"}
          </button>
        </form>
      </div>
    </section>
  );
}
