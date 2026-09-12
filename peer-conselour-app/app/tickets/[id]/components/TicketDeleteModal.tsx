import { useState } from "react";
import { PortalModal } from "../../../_portal/PortalModal";
import type { DeleteTarget } from "./types";

type TicketDeleteModalProps = {
  target: DeleteTarget;
  onClose: () => void;
  /** Resolve true bila pesan terhapus; parent lalu menutup modal. */
  onConfirm: (messageId: string) => Promise<boolean>;
};

/** Konfirmasi hapus pesan di thread tiket. */
export function TicketDeleteModal({ target, onClose, onConfirm }: TicketDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const confirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    const deleted = await onConfirm(target.id);
    if (!deleted) setIsDeleting(false);
  };

  return (
    <PortalModal
      open
      onClose={onClose}
      closeDisabled={isDeleting}
      title="Hapus Pesan Ini?"
      description="Apakah Anda yakin ingin menghapus pesan ini?"
    >
      {target.preview ? <blockquote className="ticket-message-delete-preview">{target.preview}</blockquote> : null}

      <div className="ticket-message-delete-actions">
        <button type="button" className="ticket-message-delete-btn-cancel" onClick={onClose} disabled={isDeleting}>
          Batal
        </button>
        <button
          type="button"
          className="ticket-message-delete-btn-confirm"
          onClick={() => void confirm()}
          disabled={isDeleting}
        >
          {isDeleting ? "Menghapus..." : "Ya, Hapus Pesan"}
        </button>
      </div>
    </PortalModal>
  );
}
