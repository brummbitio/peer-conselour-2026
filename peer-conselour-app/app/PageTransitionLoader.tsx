"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageTransitionLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      const fadeOutTimeout = setTimeout(() => {
        setVisible(false);
        const removeTimeout = setTimeout(() => {
          setLoading(false);
        }, 400); // Wait for CSS opacity fade out transition to complete
        return () => clearTimeout(removeTimeout);
      }, 300); // Artificial delay to make it smooth and professional
      return () => clearTimeout(fadeOutTimeout);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleTrigger = () => {
      setLoading(true);
      setTimeout(() => setVisible(true), 20);
    };
    window.addEventListener("trigger-page-loader", handleTrigger);
    return () => window.removeEventListener("trigger-page-loader", handleTrigger);
  }, []);

  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");

      // Skip invalid triggers: external links, hash links, mailto, tel, blank targets, modifier clicks
      if (
        !href ||
        targetAttr === "_blank" ||
        href.startsWith("#") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      // Skip if navigating to the same path
      const currentUrl = window.location.pathname + window.location.search;
      const cleanHref = href.split("#")[0];
      if (currentUrl === cleanHref) return;

      setLoading(true);
      // Let React render the DOM first, then trigger CSS opacity fade-in
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, [loading]);

  if (!loading) return null;

  return (
    <div className={`global-page-loader ${visible ? "visible" : ""}`} role="status" aria-live="polite">
      <div className="loader-content">
        <div className="loader-logo-wrapper">
          <img
            src="/branding/logo-konseling.png"
            alt="Logo Konseling"
            className="loader-logo"
          />
          <div className="loader-glow-ring" />
        </div>
        <div className="loader-progress-bar">
          <div className="loader-progress-fill" />
        </div>
        <p className="loader-text">Memuat Halaman...</p>
      </div>
    </div>
  );
}
