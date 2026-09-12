"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { PsikoedulasiItem, PsikoedukasiType } from "../data";
import { PsychoeducationCard } from "@/components/PsychoeducationCard";
import dynamic from "next/dynamic";

// Modal baca materi baru dibutuhkan setelah kartu diklik.
const ArticleModal = dynamic(
  () => import("@/components/ArticleModal").then((m) => m.ArticleModal),
  { ssr: false }
);

const ITEMS_PER_PAGE = 6;

const TYPE_LABELS: Record<PsikoedukasiType, string> = {
  video: "Video",
  buku: "Buku Saku",
  presentasi: "Presentasi",
  poster: "Poster",
  instagram: "Instagram",
};

const FILTER_OPTIONS: Array<{ key: PsikoedukasiType | "semua"; label: string }> = [
  { key: "semua", label: "Semua Kategori" },
  { key: "buku", label: "Buku Saku" },
  { key: "video", label: "Video" },
  { key: "presentasi", label: "Presentasi" },
  { key: "poster", label: "Poster" },
  { key: "instagram", label: "Instagram" },
];

/* ── Main Grid Component ── */

export default function PsikoedulasiGrid({
  items,
}: {
  items: PsikoedulasiItem[];
}) {
  const [activeFilter, setActiveFilter] = useState<PsikoedukasiType | "semua">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalItem, setModalItem] = useState<PsikoedulasiItem | null>(null);
  const filterMenuRef = useRef<HTMLDetailsElement | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesFilter = activeFilter === "semua" || item.type === activeFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        item.title,
        item.description,
        TYPE_LABELS[item.type],
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [items, activeFilter, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleFilterChange = (filter: PsikoedukasiType | "semua") => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      const el = document.getElementById("psiko-grid");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleCardClick = (item: PsikoedulasiItem) => {
    if (item.type === "instagram") {
      window.open(item.externalUrl, "_blank", "noopener,noreferrer");
    } else {
      setModalItem(item);
    }
  };

  const closeModal = useCallback(() => {
    setModalItem(null);
  }, []);

  // Count items per type for tab badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { semua: items.length };
    for (const item of items) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
    return counts;
  }, [items]);

  return (
    <>
      <div className="psiko-content" id="psiko-grid">
        <div className="psiko-toolbar">
          <div className="psiko-toolbar-heading">
            <h2>Psikoedukasi Lainnya</h2>
          </div>

          <div className="psiko-toolbar-controls">
            <label className="psiko-search-field">
              <div className="psiko-search-wrap">
                <svg
                  className="psiko-search-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="psiko-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari psikoedukasi lainnya"
                  aria-label="Cari konten psikoedukasi"
                />
              </div>
            </label>

            <details className="psiko-filter-menu" ref={filterMenuRef}>
              <summary
                className="psiko-filter-toggle"
                aria-label="Filter kategori psikoedukasi"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </summary>
              <div className="psiko-filter-dropdown">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`psiko-filter-option ${
                      activeFilter === option.key ? "psiko-filter-option-active" : ""
                    }`}
                    onClick={() => {
                      handleFilterChange(option.key);
                      if (filterMenuRef.current) {
                        filterMenuRef.current.open = false;
                      }
                    }}
                  >
                    <span>{option.label}</span>
                    <span>{typeCounts[option.key] || 0}</span>
                  </button>
                ))}
              </div>
            </details>
          </div>

          {/* Chip kategori scrollable — hanya tampil di tablet & mobile
              (< 1024px). Di desktop disembunyikan lewat CSS dan dropdown
              di atas yang dipakai, sehingga layout desktop tidak berubah. */}
          <div
            className="psiko-filter-chips"
            role="group"
            aria-label="Filter kategori psikoedukasi"
          >
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`psiko-filter-chip ${
                  activeFilter === option.key ? "psiko-filter-chip-active" : ""
                }`}
                aria-pressed={activeFilter === option.key}
                onClick={() => handleFilterChange(option.key)}
              >
                <span>{option.key === "semua" ? "Semua" : option.label}</span>
                <span className="psiko-filter-chip-count">
                  {typeCounts[option.key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bento Card Grid — Seragam dengan Hero */}
        {currentItems.length > 0 ? (
          <div className="psiko-grid">
            {currentItems.map((item) => (
              <PsychoeducationCard
                key={item.slug}
                item={item}
                onClick={() => handleCardClick(item)}
              />
            ))}
          </div>
        ) : (
          <div className="psiko-empty">
            <p>Belum ada konten untuk kategori ini.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="news-pagination">
            <button
              className="news-pagination-arrow"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Halaman sebelumnya"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="news-pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`news-pagination-page ${page === currentPage ? "news-pagination-active" : ""}`}
                  onClick={() => goToPage(page)}
                  aria-label={`Halaman ${page}`}
                  aria-current={page === currentPage ? "page" : undefined}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="news-pagination-arrow"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Halaman berikutnya"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Pop-up Article Modal Portal — Seragam dengan Hero */}
      {modalItem &&
        createPortal(
          <ArticleModal
            article={{
              type: modalItem.type,
              category: TYPE_LABELS[modalItem.type]?.toUpperCase() || "PSIKOEDUKASI",
              title: modalItem.title,
              description: modalItem.description,
              image: modalItem.thumbnail,
              publishedAt: modalItem.publishedAt,
              embedUrl: modalItem.embedUrl,
              externalUrl: modalItem.externalUrl,
              slideCount: modalItem.slideCount,
              slidePrefix: modalItem.slidePrefix,
              slideWidth: modalItem.slideWidth,
              slideHeight: modalItem.slideHeight,
              pageCount: modalItem.pageCount,
              fileSize: modalItem.fileSize,
            }}
            onClose={closeModal}
          />,
          document.body
        )}
    </>
  );
}
