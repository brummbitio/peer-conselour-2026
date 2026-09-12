"use client";

import { useEffect, useRef, type ReactNode } from "react";
import "../styles/portal-ui.css";

type CardScrollListProps = {
  children: ReactNode;
  ariaLabel: string;
  /** Posisi scroll kembali ke atas setiap kali nilai ini berubah (mis. nomor halaman). */
  resetKey?: string | number;
};

/** Kontainer list kartu setinggi 3 kartu (330px) dengan scroll vertikal. */
export function CardScrollList({ children, ariaLabel, resetKey }: CardScrollListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [resetKey]);

  return (
    <div
      ref={scrollRef}
      className="portal-card-scroll"
      role="region"
      aria-label={ariaLabel}
      // Region yang bisa di-scroll perlu fokus keyboard agar bisa digulir tanpa mouse.
      tabIndex={0}
    >
      <div className="portal-card-stack">{children}</div>
    </div>
  );
}
