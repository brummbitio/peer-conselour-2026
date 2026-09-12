"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface NewsItem {
  slug: string;
  category: string;
  title: string;
  meta: string;
  excerpt: string;
  image: string;
  author: string;
  publishedAt: string;
}

const ITEMS_PER_PAGE = 6;

export default function NewsGrid({ items }: { items: NewsItem[] }) {
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to the grid section header
      const el = document.getElementById("berita-lainnya");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <div className="news-grid-section" id="berita-lainnya">
      <div className="news-grid-header">
        <h2>Berita Lainnya</h2>
      </div>

      <div className="news-other-grid">
        {currentItems.map((item) => (
          <Link
            className="news-other-card"
            key={item.slug}
            href={`/berita/${item.slug}`}
            /* Tidak diunduh saat kartu masuk viewport, tapi tetap
               di-prefetch saat hover/sentuh. Tanpa ini, membuka /berita
               langsung menarik payload RSC ke-13 artikel lengkap. */
            prefetch={false}
          >
            <div className="news-other-thumb-wrap">
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 400px) 104px, (max-width: 767px) 125px, (max-width: 1023px) 148px, 175px"
                className="news-other-thumb"
                loading="lazy"
              />
            </div>
            <div className="news-other-content">
              <h3 className="news-other-title">{item.title}</h3>
              <div className="news-other-meta">
                <span className="news-other-category">{item.category}</span>
                <span className="news-other-dot">•</span>
                <span>{item.publishedAt}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

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
  );
}
