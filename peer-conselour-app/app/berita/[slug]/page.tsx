import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Share2, Calendar } from "lucide-react";
import { SiteChrome } from "../../components";
import { getNewsBySlug, newsItems } from "../../data";
import { getPublicImageSize } from "@/utils/image-size";
import "../../styles/content-pages.css";
import "./news-detail.css";

export function generateStaticParams() {
  return newsItems.map((item) => ({
    slug: item.slug,
  }));
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getNewsBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = newsItems
    .filter((item) => item.slug !== slug)
    .slice(0, 3);

  const coverSize = getPublicImageSize(article.image);

  return (
    <SiteChrome>
      <article className="news-detail-container">
        {/* Top Action / Back Link */}
        <div className="news-detail-top-nav">
          <Link href="/berita" className="news-detail-back-link">
            <ArrowLeft size={18} />
            <span>Kembali ke Berita</span>
          </Link>
        </div>

        {/* Center-Aligned Article Header */}
        <header className="news-detail-header">
          <div className="news-detail-badge-wrap">
            <span className="news-detail-category">{article.category}</span>
          </div>

          <h1 className="news-detail-title">{article.title}</h1>

          <div className="news-detail-meta-bar">
            <div className="news-detail-meta-item">
              <Calendar size={15} />
              <span>{article.publishedAt}</span>
            </div>
          </div>
        </header>

        {/* Center Cover Image — dimensi asli dibaca saat build supaya
            rasio render identik dengan <img> biasa (CLS = 0). */}
        <div className="news-detail-cover">
          <Image
            src={article.image}
            alt={article.title}
            width={coverSize.width}
            height={coverSize.height}
            sizes="(max-width: 767px) 100vw, 720px"
            className="news-detail-cover-image"
            priority
          />
        </div>

        {/* Main Article Body Typography */}
        <div className="news-detail-body">
          {article.content && article.content.length > 0 ? (
            article.content.map((block, idx) => {
              if (
                block.startsWith("<div") ||
                block.startsWith("<figure") ||
                block.startsWith("<img")
              ) {
                return (
                  <div
                    key={idx}
                    dangerouslySetInnerHTML={{ __html: block }}
                  />
                );
              }
              return (
                <p
                  key={idx}
                  className="news-detail-paragraph"
                  dangerouslySetInnerHTML={{ __html: block }}
                />
              );
            })
          ) : (
            <p className="news-detail-paragraph">{article.excerpt}</p>
          )}
        </div>

        {/* Article Footer & Share Action */}
        <footer className="news-detail-footer">
          <div className="news-detail-footer-inner">
            <span>Bagikan artikel ini:</span>
            <button className="news-detail-share-btn" type="button">
              <Share2 size={16} />
              <span>Bagikan</span>
            </button>
          </div>
        </footer>

        {/* Bottom Related Articles */}
        <section className="news-detail-related">
          <h2 className="news-detail-related-title">Berita Terkait lainnya</h2>
          <div className="news-detail-related-grid">
            {relatedArticles.map((item) => (
              <Link
                key={item.slug}
                href={`/berita/${item.slug}`}
                className="news-detail-related-card"
                prefetch={false}
              >
                <div className="news-detail-related-img-wrap">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 240px"
                    className="news-detail-related-img"
                    loading="lazy"
                  />
                  <span className="news-detail-related-badge">{item.category}</span>
                </div>
                <div className="news-detail-related-content">
                  <h3 className="news-detail-related-card-title">{item.title}</h3>
                  <span className="news-detail-related-date">{item.publishedAt}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </SiteChrome>
  );
}
