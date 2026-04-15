import Link from "next/link";
import { SiteChrome } from "../components";
import { newsItems } from "../data";
import NewsGrid from "./NewsGrid";

export default function NewsPage() {
  const featured = newsItems[0];
  const latestPosts = newsItems.slice(1);

  return (
    <SiteChrome>
      <section className="section site-width news-page">

        <div className="news-hero-layout">
          <Link className="news-feature-card" href={`/news#${featured.slug}`}>
            <div className="news-feature-image-wrap">
              <img
                src={featured.image}
                alt={featured.title}
                className="news-feature-image"
              />
              <div className="news-feature-overlay" />
              <div className="news-feature-content">
                <span className="resource-category">{featured.category}</span>
                <h2>{featured.title}</h2>
                <div className="editorial-meta news-feature-meta">
                  <span>{featured.publishedAt}</span>
                  <span>{featured.meta}</span>
                </div>
              </div>
            </div>
          </Link>

          <aside className="news-latest-panel">
            <h2>Berita Terbaru</h2>
            <div className="news-latest-list">
              {latestPosts.map((item) => (
                <Link
                  className="news-latest-item"
                  key={item.slug}
                  href={`/news#${item.slug}`}
                >
                  <div className="news-latest-thumb-wrap">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="news-latest-thumb"
                    />
                  </div>
                  <div className="news-latest-content">
                    <h3>{item.title}</h3>
                    <span>
                      {item.publishedAt} • {item.meta}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>

        <NewsGrid items={newsItems} />
      </section>
    </SiteChrome>
  );
}
