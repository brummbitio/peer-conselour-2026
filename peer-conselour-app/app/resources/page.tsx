"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SiteChrome } from "../components";
import { psikoedulasiItems } from "../data";
import type { PsikoedulasiItem } from "../data";
import PsikoedulasiGrid from "./PsikoedulasiGrid";
import "../styles/content-pages.css";


const TYPE_LABELS = {
  presentasi: "Presentasi",
  video: "Video",
  poster: "Poster",
  instagram: "Instagram",
} as const;

function ContentModal({
  item,
  onClose,
}: {
  item: PsikoedulasiItem;
  onClose: () => void;
}) {
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

        <div className="psiko-modal-body">{renderContent()}</div>

        <div className="psiko-modal-footer">
          <p className="psiko-modal-desc">{item.description}</p>
          <span className="psiko-modal-date">{item.publishedAt}</span>
        </div>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const featured = psikoedulasiItems[0];
  const latestPosts = psikoedulasiItems.slice(1, 4);
  const [modalItem, setModalItem] = useState<PsikoedulasiItem | null>(null);

  const handleItemOpen = (item: PsikoedulasiItem) => {
    if (item.type === "instagram") {
      window.open(item.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setModalItem(item);
  };

  const closeModal = useCallback(() => {
    setModalItem(null);
  }, []);

  return (
    <>
      <SiteChrome>
        <section className="section site-width psiko-page">
          <div className="psiko-top-section">
            <article className="news-hero-layout psiko-hero-layout">
              <button
                type="button"
                className="news-feature-card psiko-top-trigger"
                onClick={() => handleItemOpen(featured)}
              >
                <div className="news-feature-image-wrap psiko-feature-image-wrap">
                  <img
                    src={featured.thumbnail}
                    alt={featured.title}
                    className="news-feature-image"
                  />
                  <div className="news-feature-overlay psiko-feature-overlay" />
                  <div className="news-feature-content psiko-feature-content">
                    <span className="resource-category">
                      {TYPE_LABELS[featured.type]}
                    </span>
                    <h1>{featured.title}</h1>
                    <div className="editorial-meta news-feature-meta">
                      <span>{featured.publishedAt}</span>
                      <span>{TYPE_LABELS[featured.type]}</span>
                    </div>
                  </div>
                </div>
              </button>

              <aside className="news-latest-panel psiko-latest-panel">
                <h2>Psikoedukasi Terbaru</h2>
                <div className="news-latest-list">
                  {latestPosts.map((item) => (
                    <button
                      type="button"
                      className="news-latest-item psiko-latest-item-button"
                      key={item.slug}
                      onClick={() => handleItemOpen(item)}
                    >
                      <div className="news-latest-thumb-wrap">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="news-latest-thumb"
                        />
                      </div>
                      <div className="news-latest-content">
                        <h3>{item.title}</h3>
                        <span>
                          {item.publishedAt} • {TYPE_LABELS[item.type]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>
            </article>
          </div>

          <PsikoedulasiGrid items={psikoedulasiItems} />
        </section>
      </SiteChrome>

      {modalItem &&
        createPortal(
          <ContentModal item={modalItem} onClose={closeModal} />,
          document.body
        )}
    </>
  );
}
