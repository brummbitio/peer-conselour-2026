"use client";

import { useEffect } from "react";
import AuthStepper from "./AuthStepper";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
};

export default function AuthModal({
  open,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Login mahasiswa">
      <button
        type="button"
        className="auth-modal-backdrop"
        aria-label="Tutup login"
        onClick={onClose}
      />
      <div className="auth-modal-panel">
        <AuthStepper
          variant="modal"
          onClose={onClose}
          onAuthenticated={onAuthenticated}
        />
      </div>
    </div>
  );
}
