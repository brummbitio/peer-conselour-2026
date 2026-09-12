import { useState } from "react";
import { PortalModal } from "../../../_portal/PortalModal";
import { RESOLUTION_REASON_OPTIONS, STUDENT_CLOSURE_MESSAGE } from "./resolution";
import type { AdminResolutionType, MutationResult, ResolutionPayload, TicketViewMode } from "./types";

type TicketResolutionModalProps = {
  intent: "complete" | "reopen";
  viewer: TicketViewMode;
  onClose: () => void;
  /** payload null untuk mahasiswa: backend menandainya "selesai_mandiri_mahasiswa". */
  onComplete: (payload: ResolutionPayload | null) => Promise<MutationResult>;
  onReopen: () => Promise<MutationResult>;
};

/**
 * Pop-up "Selesai": form hasil penanganan (admin), konfirmasi akhiri sesi
 * (mahasiswa), dan konfirmasi buka kembali tiket (admin). Parent me-mount
 * komponen ini setiap kali modal dibuka, jadi form selalu mulai dari
 * pilihan "Selesai Tertangani".
 */
export function TicketResolutionModal({ intent, viewer, onClose, onComplete, onReopen }: TicketResolutionModalProps) {
  const [resolutionType, setResolutionType] = useState<AdminResolutionType>("tertangani");
  const [resolutionReason, setResolutionReason] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdminView = viewer === "admin";
  const isReopen = intent === "reopen";
  // Form hasil penanganan (tertangani / tidak tertangani) khusus admin
  const isResolutionForm = isAdminView && !isReopen;
  const isUnhandled = resolutionType === "tidak_tertangani";

  const title = isReopen
    ? "Buka Kembali Sesi Konseling?"
    : isAdminView
      ? "Selesaikan Sesi Konseling"
      : "Apakah kamu merasa sesi konseling ini sudah cukup?";
  const description = isReopen
    ? "Status tiket akan dikembalikan menjadi 'Sudah Dibalas' agar percakapan konseling dapat dilanjutkan kembali."
    : isAdminView
      ? "Pilih hasil penanganan sebelum tiket dipindahkan ke riwayat tiket selesai."
      : STUDENT_CLOSURE_MESSAGE;
  const actionLabel = isReopen ? "Ya, Buka Kembali" : isAdminView ? "Selesaikan Sesi" : "Ya, Akhiri Sesi";

  const confirm = async () => {
    if (isSubmitting) return;

    let result: MutationResult;
    if (isReopen) {
      setError(null);
      setIsSubmitting(true);
      result = await onReopen();
    } else {
      const notes = resolutionNotes.trim();
      if (isAdminView && isUnhandled) {
        if (!resolutionReason) {
          setError("Pilih alasan sesi tidak tertangani.");
          return;
        }
        if (resolutionReason === "lainnya" && !notes) {
          setError("Catatan penjelas wajib diisi untuk alasan Lainnya.");
          return;
        }
      }

      setError(null);
      setIsSubmitting(true);
      result = await onComplete(
        isAdminView
          ? {
              resolutionType,
              resolutionReason: isUnhandled ? resolutionReason : "",
              resolutionNotes: isUnhandled && resolutionReason === "lainnya" ? notes : "",
            }
          : null
      );
    }

    // Saat sukses parent menutup (unmount) modal, jadi state hanya diubah saat gagal.
    if (result !== null) {
      setError(result);
      setIsSubmitting(false);
    }
  };

  const selectResolutionType = (value: AdminResolutionType) => {
    setResolutionType(value);
    setError(null);
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
        <>
          <fieldset className="ticket-resolution-fieldset">
            <legend className="ticket-resolution-legend">Hasil penanganan</legend>
            <label className={`ticket-resolution-option${resolutionType === "tertangani" ? " is-selected" : ""}`}>
              <input
                type="radio"
                name="ticket-resolution-type"
                value="tertangani"
                checked={resolutionType === "tertangani"}
                onChange={() => selectResolutionType("tertangani")}
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
                onChange={() => selectResolutionType("tidak_tertangani")}
              />
              <span className="ticket-resolution-option-text">
                <strong>Selesai Tidak Tertangani</strong>
                <small>Sesi terhenti di tengah jalan</small>
              </span>
            </label>
          </fieldset>

          {isUnhandled ? (
            <div className="ticket-resolution-field">
              <label htmlFor="ticket-resolution-reason">Alasan</label>
              <select
                id="ticket-resolution-reason"
                value={resolutionReason}
                onChange={(event) => {
                  setResolutionReason(event.target.value);
                  setError(null);
                }}
              >
                <option value="" disabled>
                  Pilih alasan penutupan
                </option>
                {RESOLUTION_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.hint ? `${option.label} (${option.hint})` : option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {isUnhandled && resolutionReason === "lainnya" ? (
            <div className="ticket-resolution-field">
              <label htmlFor="ticket-resolution-notes">
                Catatan admin <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="ticket-resolution-notes"
                rows={3}
                maxLength={2000}
                required
                value={resolutionNotes}
                placeholder="Jelaskan alasan sesi dihentikan..."
                onChange={(event) => {
                  setResolutionNotes(event.target.value);
                  setError(null);
                }}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {error ? (
        <p className="ub-modal-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="ub-modal-actions">
        <button type="button" className="button button-secondary" onClick={onClose} disabled={isSubmitting}>
          Batal
        </button>
        <button type="button" className="button button-primary" onClick={() => void confirm()} disabled={isSubmitting}>
          {isSubmitting ? "Memproses..." : actionLabel}
        </button>
      </div>
    </PortalModal>
  );
}
