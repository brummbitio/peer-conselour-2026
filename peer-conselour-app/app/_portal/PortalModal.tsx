import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "../styles/portal-ui.css";

type PortalModalSize = "sm" | "md" | "lg";

export type PortalModalProps = {
  open: boolean;
  /**
   * Tanpa onClose modal tidak bisa ditutup manual: tombol X disembunyikan,
   * klik backdrop dan tombol Escape diabaikan (mis. form wajib lengkapi profil).
   */
  onClose?: () => void;
  /** Mengunci penutupan sementara, mis. selama request berjalan. */
  closeDisabled?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  /** Wajib diisi bila modal tidak punya title. */
  ariaLabel?: string;
  size?: PortalModalSize;
  panelClassName?: string;
  children?: ReactNode;
};

/**
 * Modal standar UB: header logo + "Layanan Konseling - Universitas Brawijaya",
 * tombol X bulat, backdrop authBackdropFade, dan panel authPanelZoom.
 */
export function PortalModal({
  open,
  onClose,
  closeDisabled = false,
  title,
  description,
  ariaLabel,
  size = "md",
  panelClassName,
  children,
}: PortalModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const canClose = !!onClose && !closeDisabled;

  // Ref supaya listener keyboard tidak dipasang ulang setiap parent re-render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus({ preventScroll: true });
    }

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [open, isMounted]);

  useEffect(() => {
    if (!open || !canClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, canClose]);

  if (!isMounted || !open) return null;

  const panelClasses = [
    "ub-modal-panel",
    size !== "md" ? `ub-modal-panel-${size}` : "",
    panelClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      className="ub-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
    >
      {onClose ? (
        <button
          type="button"
          className="ub-modal-backdrop"
          aria-label="Tutup pop up"
          tabIndex={-1}
          onClick={() => {
            if (canClose) onClose();
          }}
        />
      ) : (
        <div className="ub-modal-backdrop" aria-hidden="true" />
      )}

      <div ref={panelRef} className={panelClasses} tabIndex={-1}>
        <header className="ub-modal-header">
          <div className="ub-modal-brand">
            <Image
              src="/branding/logo-konseling.png"
              alt="Logo Layanan Konseling"
              width={40}
              height={40}
              className="ub-modal-brand-logo"
            />
            <div className="ub-modal-brand-text">
              <p>Layanan Konseling</p>
              <span>Universitas Brawijaya</span>
            </div>
          </div>
          {onClose ? (
            <button
              type="button"
              className="ub-modal-close"
              onClick={onClose}
              aria-label="Tutup"
              disabled={closeDisabled}
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </header>

        {title || description ? (
          <div className="ub-modal-heading">
            {title ? (
              <h3 id={titleId} className="ub-modal-title">
                {title}
              </h3>
            ) : null}
            {description ? <p className="ub-modal-description">{description}</p> : null}
          </div>
        ) : null}

        {children}
      </div>
    </div>,
    document.body
  );
}
