import { useState } from "react";
import type { FormEvent } from "react";
import type { AuthRole } from "../../../auth/auth-provider";
import { PortalModal } from "../../../_portal/PortalModal";

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperadmin: boolean;
  createAdmin: (data: { email: string; role: AuthRole }) => Promise<{ ok: boolean; message?: string }>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function AddAdminModal({
  isOpen,
  onClose,
  isSuperadmin,
  createAdmin,
  onSuccess,
  onError,
}: AddAdminModalProps) {
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "superadmin">("admin");
  const [isSaving, setIsSaving] = useState(false);

  const submitAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSuperadmin || isSaving) return;

    if (!newAdminEmail.trim()) {
      onError("Email admin tidak boleh kosong.");
      return;
    }

    setIsSaving(true);
    const result = await createAdmin({
      email: newAdminEmail,
      role: newAdminRole,
    });
    setIsSaving(false);

    if (!result.ok) {
      onError(result.message || "Admin belum berhasil ditambahkan.");
      return;
    }

    onSuccess(result.message || "Admin berhasil ditambahkan.");
    setNewAdminEmail("");
    setNewAdminRole("admin");
    onClose();
  };

  return (
    <PortalModal open={isOpen} onClose={onClose} closeDisabled={isSaving} title="Tambah Admin" size="sm">
      <form className="admin-add-form" onSubmit={submitAdmin}>
        <label className="admin-add-field">
          <span>Email Admin</span>
          <input
            type="email"
            className="admin-search-input"
            placeholder="admin@ub.ac.id"
            value={newAdminEmail}
            onChange={(event) => {
              setNewAdminEmail(event.target.value);
              onError("");
              onSuccess("");
            }}
            autoComplete="email"
          />
        </label>
        <label className="admin-add-field">
          <span>Role Staf</span>
          <select
            className="admin-search-input"
            value={newAdminRole}
            onChange={(event) => {
              setNewAdminRole(event.target.value as "admin" | "superadmin");
              onError("");
              onSuccess("");
            }}
          >
            <option value="admin">Admin / Konselor</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </label>
        <div className="ub-modal-actions">
          <button type="button" className="button button-secondary" onClick={onClose} disabled={isSaving}>
            Batal
          </button>
          <button type="submit" className="button button-primary" disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan Admin"}
          </button>
        </div>
      </form>
    </PortalModal>
  );
}
