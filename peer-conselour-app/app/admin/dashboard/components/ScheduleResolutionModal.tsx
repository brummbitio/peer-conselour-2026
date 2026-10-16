"use client";

import { useEffect, useState } from "react";
import { PortalModal } from "../../../_portal/PortalModal";
import { BASE_URL, api } from "@/utils/api";
// Impor useAuth untuk mengambil data user yang sedang login
import { useAuth } from "../../../auth/auth-provider";
import "../../../styles/account-ticket.css";

const UNHANDLED_REASON_OPTIONS = [
  { value: "Klien tidak balas/respon", label: "Klien tidak balas/respon" },
  { value: "Klien tidak hadir", label: "Klien tidak hadir saat jadwal sesi" },
  { value: "Mengundurkan diri", label: "Klien mengundurkan diri" },
  { value: "Konselor tidak tersedia", label: "Konselor berhalangan / tidak tersedia" },
];

export type CounselorOption = {
  id: number;
  email: string;
  full_name: string;
  role: string;
};

type ScheduleResolutionModalProps = {
  schedule: any;
  onClose: () => void;
  onSuccess: () => void;
};

export function ScheduleResolutionModal({
  schedule,
  onClose,
  onSuccess,
}: ScheduleResolutionModalProps) {
  // Ambil data user yang sedang login
  const { user } = useAuth();
  
  // Cek apakah user adalah peer atau konselor (yang dibatasi hak aksesnya)
  const isRestrictedRole = user?.role === "peer" || user?.role === "konselor";

  const [resolutionType, setResolutionType] = useState<"tertangani" | "tidak_tertangani">("tertangani");
  const [subStatusTertangani, setSubStatusTertangani] = useState("Tertangani - Selesai");
  const [unhandledReason, setUnhandledReason] = useState("Klien tidak balas/respon");

  const [counselors, setCounselors] = useState<CounselorOption[]>([]);
  const [selectedCounselorEmail, setSelectedCounselorEmail] = useState("");
  const [isLoadingCounselors, setIsLoadingCounselors] = useState(false);

  const [deskripsiKeluhan, setDeskripsiKeluhan] = useState("");
  const [kodeDiagnosa, setKodeDiagnosa] = useState("");
  const [intervensi, setIntervensi] = useState("");
  const [rekomendasiJadwal, setRekomendasiJadwal] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUnhandled = resolutionType === "tidak_tertangani";

  useEffect(() => {
    const fetchCounselors = async () => {
      setIsLoadingCounselors(true);
      try {
        const res = await fetch(`${BASE_URL}/api/admin/admins`, {
          credentials: "include",
        });

        if (res.ok) {
          const result = await res.json();
          const rawList = Array.isArray(result) ? result : result.data || [];

          const counselorList = rawList.filter((u: any) => {
            const role = (u.role || u.Role || "").toLowerCase();
            return role === "konselor" || role === "peer" || role === "admin";
          });

          setCounselors(counselorList);

          if (counselorList.length > 0) {
            // LOGIKA PENGUNCIAN:
            // Jika role-nya peer atau konselor, paksa gunakan email user yang sedang login
            if (isRestrictedRole && user?.email) {
              setSelectedCounselorEmail(user.email);
            } else {
              // Jika admin/superadmin, pasang email sesuai nama penanggung jawab di jadwal
              const matchHandler = counselorList.find(
                (c: any) => (c.full_name || c.FullName) === schedule.handlerName
              );
              if (matchHandler) {
                setSelectedCounselorEmail(matchHandler.email || matchHandler.Email);
              } else {
                setSelectedCounselorEmail(counselorList[0].email || counselorList[0].Email);
              }
            }
          }
        }
      } catch (err) {
        console.error("Gagal memuat daftar konselor:", err);
      } finally {
        setIsLoadingCounselors(false);
      }
    };

    fetchCounselors();
  }, [schedule.handlerName, isRestrictedRole, user?.email]);

  const confirm = async () => {
    if (isSubmitting) return;

    if (!selectedCounselorEmail) {
      setError("Pilih psikolog/konselor penanggung jawab.");
      return;
    }
    if (!deskripsiKeluhan.trim()) {
      setError("Deskripsi keluhan wajib diisi.");
      return;
    }

    const finalStatus = !isUnhandled ? subStatusTertangani : `Tidak Tertangani - ${unhandledReason}`;

    setError(null);
    setIsSubmitting(true);

    try {
      await api.post("/api/rekaman-konseling", {
        schedule_id: schedule.id,
        
        client_nim: schedule.nim || schedule.studentNim || "-", 
        client_name: schedule.clientName,
        session_date: schedule.dateValue || new Date().toISOString().split('T')[0],
        observation_notes: keterangan.trim() || "-",
        // --------------------------------------------

        counselor_email: selectedCounselorEmail,
        deskripsi_keluhan: deskripsiKeluhan.trim(),
        kode_diagnosa: !isUnhandled ? kodeDiagnosa.trim() : "-",
        intervensi: !isUnhandled ? intervensi.trim() : "-",
        rekomendasi_jadwal: !isUnhandled ? rekomendasiJadwal.trim() : "",
        keterangan: keterangan.trim(),
        sub_status: finalStatus,
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan rekaman konseling.");
      setIsSubmitting(false);
    }
  };

  return (
    <PortalModal
      open
      onClose={onClose}
      closeDisabled={isSubmitting}
      title="Selesaikan Sesi & Buat Rekaman Konseling"
      description={`Lengkapi hasil evaluasi untuk sesi klien: ${schedule.clientName}`}
      size="md"
    >
      <div className="account-page account-ticket" style={{ display: "grid", gap: "16px" }}>
        <fieldset className="ticket-resolution-fieldset">
          <legend className="ticket-resolution-legend">Hasil penanganan</legend>
          <label className={`ticket-resolution-option${resolutionType === "tertangani" ? " is-selected" : ""}`}>
            <input
              type="radio"
              name="ticket-resolution-type"
              value="tertangani"
              checked={resolutionType === "tertangani"}
              onChange={() => {
                setResolutionType("tertangani");
                setError(null);
              }}
            />
            <span className="ticket-resolution-option-text">
              <strong>Selesai Tertangani</strong>
              <small>Konseling berjalan baik dan tuntas</small>
            </span>
          </label>
          <label
            className={`ticket-resolution-option is-unhandled${
              resolutionType === "tidak_tertangani" ? " is-selected" : ""
            }`}
          >
            <input
              type="radio"
              name="ticket-resolution-type"
              value="tidak_tertangani"
              checked={resolutionType === "tidak_tertangani"}
              onChange={() => {
                setResolutionType("tidak_tertangani");
                setError(null);
              }}
            />
            <span className="ticket-resolution-option-text">
              <strong>Selesai Tidak Tertangani</strong>
              <small>Sesi terhenti di tengah jalan atau batal</small>
            </span>
          </label>
        </fieldset>

        {!isUnhandled ? (
          <div className="ticket-resolution-field">
            <label htmlFor="ticket-sub-status">Status Kasus</label>
            <select
              id="ticket-sub-status"
              value={subStatusTertangani}
              onChange={(e) => setSubStatusTertangani(e.target.value)}
            >
              <option value="Tertangani - Selesai">Tertangani - Selesai (Kasus Tuntas)</option>
              <option value="Konseling Berjalan (Follow-up)">
                Konseling Berjalan (Perlu Sesi Lanjutan / Follow-up)
              </option>
            </select>
          </div>
        ) : (
          <div className="ticket-resolution-field">
            <label htmlFor="ticket-unhandled-reason">Alasan Tidak Tertangani</label>
            <select
              id="ticket-unhandled-reason"
              value={unhandledReason}
              onChange={(e) => setUnhandledReason(e.target.value)}
            >
              {UNHANDLED_REASON_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ticket-resolution-field">
          <label htmlFor="ticket-counselor">
            Psikolog / Konselor <span aria-hidden="true">*</span>
          </label>
          <select
            id="ticket-counselor"
            value={selectedCounselorEmail}
            // TAMBAHKAN isRestrictedRole KE ATRIBUT DISABLED
            disabled={isLoadingCounselors || isRestrictedRole}
            onChange={(e) => setSelectedCounselorEmail(e.target.value)}
          >
            {counselors.length === 0 ? (
              <option value="">{isLoadingCounselors ? "Memuat konselor..." : "Tidak ada konselor ditemukan"}</option>
            ) : (
              counselors.map((c: any) => (
                <option key={c.id || c.ID} value={c.email || c.Email}>
                  {c.full_name || c.FullName} ({(c.role || c.Role) === "konselor" ? "Psikolog" : "Peer Counselor"})
                </option>
              ))
            )}
          </select>
        </div>

        {!isUnhandled && (
          <div className="ticket-resolution-field">
            <label htmlFor="ticket-diagnosa">Kode Diagnosa</label>
            <input
              id="ticket-diagnosa"
              type="text"
              placeholder="Contoh: F41.1, F32, Z55..."
              value={kodeDiagnosa}
              onChange={(e) => setKodeDiagnosa(e.target.value)}
            />
          </div>
        )}

        <div className="ticket-resolution-field">
          <label htmlFor="ticket-deskripsi-keluhan">
            Deskripsi Keluhan <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="ticket-deskripsi-keluhan"
            rows={3}
            placeholder="Tuliskan keluhan mahasiswa..."
            value={deskripsiKeluhan}
            onChange={(e) => {
              setDeskripsiKeluhan(e.target.value);
              setError(null);
            }}
          />
        </div>

        {!isUnhandled && (
          <div className="ticket-resolution-field">
            <label htmlFor="ticket-intervensi">Intervensi</label>
            <textarea
              id="ticket-intervensi"
              rows={3}
              placeholder="Tuliskan bentuk intervensi..."
              value={intervensi}
              onChange={(e) => setIntervensi(e.target.value)}
            />
          </div>
        )}

        {!isUnhandled && (
          <div className="ticket-resolution-field">
            <label htmlFor="ticket-rekomendasi">Rekomendasi / Jadwal Selanjutnya</label>
            <textarea
              id="ticket-rekomendasi"
              rows={2}
              placeholder="Rekomendasi sesi selanjutnya..."
              value={rekomendasiJadwal}
              onChange={(e) => setRekomendasiJadwal(e.target.value)}
            />
          </div>
        )}

        <div className="ticket-resolution-field">
          <label htmlFor="ticket-keterangan">Keterangan Tambahan</label>
          <textarea
            id="ticket-keterangan"
            rows={2}
            placeholder="Catatan observasi tambahan..."
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="ub-modal-error" role="alert" style={{ marginTop: "12px" }}>
          {error}
        </p>
      )}

      <div className="ub-modal-actions" style={{ marginTop: "16px" }}>
        <button
          type="button"
          className="button button-secondary"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Batal
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={() => void confirm()}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Rekaman & Selesaikan"}
        </button>
      </div>
    </PortalModal>
  );
}