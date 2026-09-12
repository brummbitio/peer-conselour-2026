"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import "./PsychoeducationBento.css";

export interface ArticleData {
  type: "video" | "presentasi" | "poster" | "instagram" | "buku";
  category: string;
  title: string;
  description?: string;
  image: string;
  publishedAt?: string;
  embedUrl?: string;
  externalUrl?: string;
  slideCount?: number;
  slidePrefix?: string;
  slideWidth?: number;
  slideHeight?: number;
  pageCount?: number;
  fileSize?: string;
}

export function ArticleModal({
  article,
  onClose,
}: {
  article: ArticleData;
  onClose: () => void;
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleNextSlide = () => {
    if (article.slideCount && currentSlideIndex < article.slideCount - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNextSlide();
      if (e.key === "ArrowLeft") handlePrevSlide();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, article.slideCount, currentSlideIndex]);

  const hasSlides =
    (article.type === "presentasi" || article.type === "buku") &&
    Boolean(article.slideCount) &&
    Boolean(article.slidePrefix);

  const isVideo =
    (article.type === "video" || article.type === "presentasi") &&
    Boolean(article.embedUrl) &&
    !hasSlides;

  return (
    <motion.div
      className="article-pop-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClose}
    >
      <motion.div
        className="article-pop-modal-panel"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Column: Media Container */}
        <div
          className={`article-modal-media-col ${
            isVideo ? "article-modal-media-col--video" : ""
          }`}
        >
          {hasSlides ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Slide asli berukuran ~600 KB per halaman. Lewat next/image
                  dikirim sebagai AVIF/WebP seukuran layar (hemat ~90%).
                  Dimensi diberikan eksplisit supaya rasio render tetap sama
                  persis dengan <img> biasa. */}
              <Image
                src={`${article.slidePrefix}${currentSlideIndex + 1}.jpg`}
                alt={`Halaman ${currentSlideIndex + 1}`}
                width={article.slideWidth ?? 1240}
                height={article.slideHeight ?? 1755}
                sizes="(max-width: 767px) 92vw, (max-width: 1023px) 90vw, 560px"
                className="article-modal-media-img"
                priority
              />

              {/* Navigation Controls */}
              {currentSlideIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  aria-label="Halaman sebelumnya"
                  className="article-modal-nav-btn article-modal-nav-btn--prev"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {currentSlideIndex < (article.slideCount || 0) - 1 && (
                <button
                  type="button"
                  onClick={handleNextSlide}
                  aria-label="Halaman berikutnya"
                  className="article-modal-nav-btn article-modal-nav-btn--next"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              {/* Slide Counter */}
              <div className="article-modal-counter">
                {currentSlideIndex + 1} / {article.slideCount}
              </div>
            </div>
          ) : isVideo ? (
            <div className="article-modal-video-wrap">
              <iframe
                src={article.embedUrl}
                title={article.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="article-modal-video-iframe"
              />
            </div>
          ) : (
            /* Poster */
            <img
              src={article.image}
              alt={article.title}
              className="article-modal-media-img"
            />
          )}
        </div>

        {/* Right Column: Info & Action */}
        <div className="article-modal-info-col">
          <div className="article-modal-info-main">
            {/* Category Badge */}
            <span className="magic-bento-card__badge">{article.category}</span>

            {/* Title */}
            <h2 className="article-modal-title">{article.title}</h2>

            {/* Description */}
            {article.description && (
              <p className="article-modal-desc">{article.description}</p>
            )}

            {/* Published / Meta */}
            {article.publishedAt && (
              <span className="article-modal-meta">{article.publishedAt}</span>
            )}
          </div>

          {/* Bottom Action: Kembali Button */}
          <div className="article-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="article-modal-close-btn"
            >
              <ArrowLeft size={18} />
              <span>Kembali</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
