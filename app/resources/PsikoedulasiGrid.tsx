"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { PsikoedulasiItem, PsikoedukasiType } from "../data";

const ITEMS_PER_PAGE = 6;

const TYPE_LABELS: Record<PsikoedukasiType, string> = {
  presentasi: "Presentasi",
  video: "Video",
  poster: "Poster",
  instagram: "Instagram",
};
const FILTER_OPTIONS: Array<{ key: PsikoedukasiType | "semua"; label: string }> = [
  { key: "semua", label: "Semua Kategori" },
  { key: "presentasi", label: "Presentasi" },
  { key: "video", label: "Video" },
  { key: "poster", label: "Poster" },
  { key: "instagram", label: "Instagram" },
];

/* ── Overlay Icons ── */

function PlayOverlay() {
  return (
    <div className="psiko-card-overlay">
      <div className="psiko-play-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      </div>
    </div>
  );
}

function SlideOverlay() {
  return (
    <div className="psiko-card-overlay">
      <div className="psiko-slide-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      </div>
    </div>
  );
}

function PosterOverlay() {
  return (
    <div className="psiko-card-overlay">
      <div className="psiko-slide-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    </div>
  );
}

function InstagramOverlay() {
  return (
    <div className="psiko-card-overlay">
      <div className="psiko-slide-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </div>
    </div>
  );
}

function getOverlay(type: PsikoedukasiType) {
  switch (type) {
    case "video":
      return <PlayOverlay />;
    case "presentasi":
      return <SlideOverlay />;
    case "poster":
      return <PosterOverlay />;
    case "instagram":
      return <InstagramOverlay />;
  }
}

/* ── Modal Component ── */

function ContentModal({
  item,
  onClose,
}: {
  item: PsikoedulasiItem;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const renderContent = () => {
    switch (item.type) {
      case "presentasi":
        return (
          <div className="modal-embed-wrap modal-embed-slides">
            <iframe
              src={item.embedUrl || item.externalUrl}
              title={item.title}
              allowFullScreen
              className="modal-iframe"
            />
          </div>
        );

      case "video":
        return (
          <div className="modal-embed-wrap modal-embed-video">
            <iframe
              src={item.embedUrl || item.externalUrl}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="modal-iframe"
            />
          </div>
        );

      case "poster":
        return (
          <div className="modal-poster-wrap">
            <img
              src={item.thumbnail}
              alt={item.title}
              className="modal-poster-image"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="psiko-modal-backdrop" onClick={onClose}>
      <div
        className={`psiko-modal ${item.type === "poster" ? "psiko-modal-poster" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="psiko-modal-header">
          <div className="psiko-modal-title-wrap">
            <span className={`psiko-type-badge psiko-type-${item.type}`}>
              {TYPE_LABELS[item.type]}
            </span>
            <h2 className="psiko-modal-title">{item.title}</h2>
          </div>
          <button
            className="psiko-modal-close"
            onClick={onClose}
            aria-label="Tutup"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="psiko-modal-body">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="psiko-modal-footer">
          <p className="psiko-modal-desc">{item.description}</p>
          <span className="psiko-modal-date">{item.publishedAt}</span>
        </div>
      </div>
    </div>
  );
}

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
      // Instagram: open in new tab
      window.open(item.externalUrl, "_blank", "noopener,noreferrer");
    } else {
      // Presentasi, Video, Poster: open modal
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
        </div>

        {/* Card Grid */}
        {currentItems.length > 0 ? (
          <div className="psiko-grid">
            {currentItems.map((item) => (
              <button
                type="button"
                className="psiko-card"
                key={item.slug}
                onClick={() => handleCardClick(item)}
              >
                <div className="psiko-card-thumb">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="psiko-card-image"
                  />
                  {getOverlay(item.type)}
                  <span className={`psiko-type-badge psiko-type-${item.type}`}>
                    {TYPE_LABELS[item.type]}
                  </span>
                </div>
                <div className="psiko-card-body">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <span className="psiko-card-date">{item.publishedAt}</span>
                </div>
              </button>
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

      {/* Modal — rendered via portal to escape stacking context */}
      {modalItem &&
        createPortal(
          <ContentModal item={modalItem} onClose={closeModal} />,
          document.body
        )}
    </>
  );
}
