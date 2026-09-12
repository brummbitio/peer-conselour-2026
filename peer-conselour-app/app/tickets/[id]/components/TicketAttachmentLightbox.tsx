import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from "lucide-react";
import type { LightboxImage } from "./types";

type TicketAttachmentLightboxProps = {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
};

async function downloadImage(url: string, filename: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoke setelah klik diproses supaya unduhan tidak terputus (Safari).
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    // Presigned URL lintas origin bisa ditolak CORS: buka di tab baru sebagai cadangan.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

/** Pratinjau gambar fullscreen: navigasi (tombol & panah keyboard), zoom, dan unduh. */
export function TicketAttachmentLightbox({ images, initialIndex, onClose }: TicketAttachmentLightboxProps) {
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
  const [isZoomed, setIsZoomed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const hasMultipleImages = images.length > 1;
  const currentImage = images[index];

  const navigate = useCallback(
    (direction: 1 | -1) => {
      setIndex((current) => (current + direction + images.length) % images.length);
      setIsZoomed(false);
    },
    [images.length]
  );

  useEffect(() => {
    if (imageRef.current) imageRef.current.style.transformOrigin = "";
  }, [index]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      } else if (event.key === "ArrowRight" && hasMultipleImages) {
        navigate(1);
      } else if (event.key === "ArrowLeft" && hasMultipleImages) {
        navigate(-1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [hasMultipleImages, navigate]);

  // Titik zoom mengikuti posisi kursor; ditulis langsung ke style agar gerakan
  // mouse tidak memicu re-render.
  const setZoomOriginFromPointer = (event: MouseEvent<HTMLDivElement>) => {
    const image = imageRef.current;
    if (!image) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    image.style.transformOrigin = `${x}% ${y}%`;
  };

  const toggleZoomAtPointer = (event: MouseEvent<HTMLDivElement>) => {
    setZoomOriginFromPointer(event);
    setIsZoomed((zoomed) => !zoomed);
  };

  const toggleZoomAtCenter = () => {
    if (imageRef.current) imageRef.current.style.transformOrigin = "50% 50%";
    setIsZoomed((zoomed) => !zoomed);
  };

  if (!currentImage) return null;

  return createPortal(
    <div
      className="ticket-lightbox-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Pratinjau gambar ${currentImage.name}`}
    >
      <div className="ticket-lightbox-content" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="ticket-lightbox-zoom"
          onClick={toggleZoomAtCenter}
          aria-label={isZoomed ? "Perkecil gambar" : "Perbesar gambar"}
          title={isZoomed ? "Perkecil" : "Perbesar"}
        >
          {isZoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
        </button>
        <button
          type="button"
          className="ticket-lightbox-download"
          onClick={() => void downloadImage(currentImage.url, currentImage.name)}
          aria-label="Unduh gambar"
          title="Unduh Gambar"
        >
          <Download size={20} />
        </button>
        <button type="button" className="ticket-lightbox-close" onClick={onClose} aria-label="Tutup">
          <X size={24} />
        </button>

        {hasMultipleImages && (
          <>
            <button
              type="button"
              className="ticket-lightbox-nav ticket-lightbox-nav-prev"
              onClick={() => navigate(-1)}
              aria-label="Gambar sebelumnya"
            >
              <ChevronLeft size={36} />
            </button>
            <button
              type="button"
              className="ticket-lightbox-nav ticket-lightbox-nav-next"
              onClick={() => navigate(1)}
              aria-label="Gambar selanjutnya"
            >
              <ChevronRight size={36} />
            </button>
          </>
        )}

        <div className="ticket-lightbox-image-wrap">
          <div
            className={`ticket-lightbox-stage${isZoomed ? " is-zoomed" : ""}`}
            onClick={toggleZoomAtPointer}
            onMouseMove={isZoomed ? setZoomOriginFromPointer : undefined}
          >
            <img
              ref={imageRef}
              src={currentImage.url}
              alt={currentImage.name}
              className="ticket-lightbox-image"
              draggable={false}
            />
          </div>
          <p className="ticket-lightbox-caption">
            {currentImage.name}
            {hasMultipleImages ? (
              <span className="ticket-lightbox-counter">
                {index + 1} / {images.length}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
