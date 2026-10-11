import { useEffect, useState } from "react";
import { PortalModal } from "../../../_portal/PortalModal";
import { STUDENT_CLOSURE_MESSAGE } from "./resolution";
import type { AdminResolutionType, MutationResult, ResolutionPayload, TicketViewMode } from "./types";
import { BASE_URL } from "@/utils/api";

// Opsi Baku Tidak Tertangani
export const UNHANDLED_REASON_OPTIONS = [
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

export type ClinicalRecordPayload = {
  counselor_email: string;
  deskripsi_keluhan: string;
  kode_diagnosa: string;
  intervensi: string;
  rekomendasi_jadwal: string;
  keterangan: string;
  sub_status: string;
};

export type ExtendedResolutionPayload = ResolutionPayload & {
  clinicalRecord?: ClinicalRecordPayload;
};

type TicketResolutionModalProps = {
  intent: "complete" | "reopen";
  viewer: TicketViewMode;
  defaultCounselorEmail?: string;
  onClose: () => void;
  onComplete: (payload: ExtendedResolutionPayload | null) => Promise<MutationResult>;
  onReopen: () => Promise<MutationResult>;
};

export function TicketResolutionModal({
  intent,
  viewer,
  defaultCounselorEmail = "",
  onClose,
  onComplete,
  onReopen,
}: TicketResolutionModalProps) {
  const [resolutionType, setResolutionType] = useState<AdminResolutionType>("tertangani");

  // Sub-kategori Status Kasus
  const [subStatusTertangani, setSubStatusTertangani] = useState("Tertangani - Selesai");
  const [unhandledReason, setUnhandledReason] = useState("Klien tidak balas/respon");

  // Dropdown Konselor dari Database
  const [counselors, setCounselors] = useState<CounselorOption[]>([]);
  const [selectedCounselorEmail, setSelectedCounselorEmail] = useState(defaultCounselorEmail);
  const [isLoadingCounselors, setIsLoadingCounselors] = useState(false);

  // Field Form Rekaman Konseling (Seluruhnya Full Text)
  const [deskripsiKeluhan, setDeskripsiKeluhan] = useState("");
  const [kodeDiagnosa, setKodeDiagnosa] = useState("");
  const [intervensi, setIntervensi] = useState("");
  const [rekomendasiJadwal, setRekomendasiJadwal] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdminView = viewer === "admin";
  const isReopen = intent === "reopen";
  const isResolutionForm = isAdminView && !isReopen;
  const isUnhandled = resolutionType === "tidak_tertangani";

  useEffect(() => {
    if (!isResolutionForm) return;

    const fetchCounselors = async () => {
      setIsLoadingCounselors(true);
      try {
        // Menggunakan endpoint yang valid
        const res = await fetch(`${BASE_URL}/api/admin/admins`, {
          credentials: "include",
        });

        if (res.ok) {
          const result = await res.json();
          const rawList = Array.isArray(result) ? result : result.data || [];

          // Filter dinamis: mencari properti 'role' atau 'Role'
          const counselorList = rawList.filter((u: any) => {
            const role = (u.role || u.Role || "").toLowerCase();
            return role === "konselor" || role === "peer" || role === "admin";
          });

          setCounselors(counselorList);

          // Tentukan pilihan default dropdown
          if (counselorList.length > 0) {
            const matchDefault = counselorList.find(
              (c: any) => c.email === defaultCounselorEmail || c.Email === defaultCounselorEmail
            );
            
            if (matchDefault) {
              setSelectedCounselorEmail(matchDefault.email || matchDefault.Email);
            } else if (!selectedCounselorEmail) {
              setSelectedCounselorEmail(counselorList[0].email || counselorList[0].Email);
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
  }, [isResolutionForm, defaultCounselorEmail]);

  const title = isReopen
    ? "Buka Kembali Sesi Konseling?"
    : isAdminView
      ? "Selesaikan Sesi & Buat Rekaman Konseling"
      : "Apakah kamu merasa sesi konseling ini sudah cukup?";

  const description = isReopen
    ? "Status tiket akan dikembalikan menjadi 'Sudah Dibalas' agar percakapan konseling dapat dilanjutkan kembali."
    : isAdminView
      ? "Lengkapi hasil evaluasi penanganan dan rekaman konseling di bawah ini."
      : STUDENT_CLOSURE_MESSAGE;

  const actionLabel = isReopen
    ? "Ya, Buka Kembali"
    : isAdminView
      ? "Simpan Rekaman & Selesaikan"
      : "Ya, Akhiri Sesi";

  const confirm = async () => {
    if (isSubmitting) return;

    let result: MutationResult;
    if (isReopen) {
      setError(null);
      setIsSubmitting(true);
      result = await onReopen();
    } else {
      if (isAdminView) {
        if (!selectedCounselorEmail) {
          setError("Pilih psikolog/konselor penanggung jawab.");
          return;
        }

        if (!deskripsiKeluhan.trim()) {
          setError("Deskripsi keluhan wajib diisi.");
          return;
        }

        const finalStatus = !isUnhandled
          ? subStatusTertangani
          : `Tidak Tertangani - ${unhandledReason}`;

        const payload: ExtendedResolutionPayload = {
          resolutionType,
          resolutionReason: !isUnhandled ? subStatusTertangani : unhandledReason,
          resolutionNotes: keterangan.trim(),
          clinicalRecord: {
            counselor_email: selectedCounselorEmail,
            deskripsi_keluhan: deskripsiKeluhan.trim(),
            kode_diagnosa: !isUnhandled ? kodeDiagnosa.trim() : "-",
            intervensi: !isUnhandled ? intervensi.trim() : "-",
            rekomendasi_jadwal: !isUnhandled ? rekomendasiJadwal.trim() : "",
            keterangan: keterangan.trim(),
            sub_status: finalStatus,
          },
        };

        setError(null);
        setIsSubmitting(true);
        result = await onComplete(payload);
      } else {
        setError(null);
        setIsSubmitting(true);
        result = await onComplete(null);
      }
    }

    if (result !== null) {
      setError(result);
      setIsSubmitting(false);
    }
  };

  return (
    <PortalModal
      open
      onClose={onClose}
      closeDisabled={isSubmitting}
      title={title}
      description={description}
      size={isResolutionForm ? "md" : "sm"}
    >
      {isResolutionForm ? (
        <div style={{ display: "grid", gap: "16px" }}>
          {/* PILIHAN HASIL PENANGANAN */}
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

          {/* SUB-STATUS KATEGORI */}
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

          {/* 1. PSIKOLOG / KONSELOR (DROPDOWN DARI DATABASE) */}
          <div className="ticket-resolution-field">
            <label htmlFor="ticket-counselor">
              Psikolog / Konselor <span aria-hidden="true">*</span>
            </label>
            <select
              id="ticket-counselor"
              value={selectedCounselorEmail}
              disabled={isLoadingCounselors}
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

          {/* 2. KODE DIAGNOSA (FULL TEXT) */}
          {!isUnhandled && (
            <div className="ticket-resolution-field">
              <label htmlFor="ticket-diagnosa">Kode Diagnosa</label>
              <input
                id="ticket-diagnosa"
                type="text"
                placeholder="Contoh: F41.1, F32, Z55, atau diagnosa klinis lainnya..."
                value={kodeDiagnosa}
                onChange={(e) => setKodeDiagnosa(e.target.value)}
              />
            </div>
          )}

          {/* 3. DESKRIPSI KELUHAN (FULL TEXT) */}
          <div className="ticket-resolution-field">
            <label htmlFor="ticket-deskripsi-keluhan">
              Deskripsi Keluhan <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="ticket-deskripsi-keluhan"
              rows={3}
              placeholder="Tuliskan keluhan atau kondisi yang dialami mahasiswa..."
              value={deskripsiKeluhan}
              onChange={(e) => {
                setDeskripsiKeluhan(e.target.value);
                setError(null);
              }}
            />
          </div>

          {/* 4. INTERVENSI (FULL TEXT) */}
          {!isUnhandled && (
            <div className="ticket-resolution-field">
              <label htmlFor="ticket-intervensi">Intervensi</label>
              <textarea
                id="ticket-intervensi"
                rows={3}
                placeholder="Tuliskan bentuk intervensi atau teknik konseling yang diberikan..."
                value={intervensi}
                onChange={(e) => setIntervensi(e.target.value)}
              />
            </div>
          )}

          {/* 5. REKOMENDASI / JADWAL SELANJUTNYA (FULL TEXT) */}
          {!isUnhandled && (
            <div className="ticket-resolution-field">
              <label htmlFor="ticket-rekomendasi">Rekomendasi / Jadwal Selanjutnya</label>
              <textarea
                id="ticket-rekomendasi"
                rows={2}
                placeholder="Tuliskan rekomendasi atau rencana jadwal sesi berikutnya..."
                value={rekomendasiJadwal}
                onChange={(e) => setRekomendasiJadwal(e.target.value)}
              />
            </div>
          )}

          {/* 6. KETERANGAN (FULL TEXT) */}
          <div className="ticket-resolution-field">
            <label htmlFor="ticket-keterangan">Keterangan</label>
            <textarea
              id="ticket-keterangan"
              rows={2}
              placeholder="Catatan observasi tambahan atau keterangan lainnya..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="ub-modal-error" role="alert" style={{ marginTop: "12px" }}>
          {error}
        </p>
      ) : null}

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
          {isSubmitting ? "Memproses..." : actionLabel}
        </button>
      </div>
    </PortalModal>
  );
}