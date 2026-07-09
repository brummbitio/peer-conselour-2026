"use client";

import Link from "next/link";
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

const ITEMS_PER_PAGE = 3;

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

      <div className="news-card-grid">
        {currentItems.map((item) => (
          <Link
            className="news-grid-card"
            key={item.slug}
            href={`/news#${item.slug}`}
          >
            <div className="news-grid-image-wrap">
              <img
                src={item.image}
                alt={item.title}
                className="news-grid-image"
              />
            </div>
            <div className="news-grid-body">
              <span className="resource-category">{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
              <div className="editorial-meta">
                <span>{item.publishedAt}</span>
                <span>{item.meta}</span>
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
