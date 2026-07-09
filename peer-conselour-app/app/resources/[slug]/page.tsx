import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "../../components";
import { getResourceBySlug, resources } from "../../data";

export function generateStaticParams() {
  return resources.map((resource) => ({
    slug: resource.slug,
  }));
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getResourceBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = resources.filter((resource) => resource.slug !== slug);

  return (
    <SiteChrome>
      <section className="section page-hero site-width">
        <div className="page-hero-card glass article-hero-card">
          <p className="eyebrow">{article.category}</p>
          <h1 className="page-title article-title">{article.title}</h1>
          <p className="hero-text">{article.excerpt}</p>
          <div className="article-meta">
            <span>{article.author}</span>
            <span>{article.publishedAt}</span>
            <span>{article.meta}</span>
          </div>
        </div>
      </section>

      <section className="section site-width article-section">
        <div className="article-layout">
          <article className="article-main">
            <div className={`article-cover article-cover-${article.coverTone}`}>
              <Image
                src={article.image}
                alt={article.title}
                fill
                className="article-cover-image"
              />
              <div className="article-cover-badge">{article.coverLabel}</div>
              <div className="article-cover-orb" />
            </div>

            <div className="glass article-content">
              {article.content.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>

          <aside className="article-sidebar">
            <div className="glass sidebar-card">
              <p className="eyebrow">Other articles</p>
              <div className="sidebar-list">
                {relatedArticles.map((resource) => (
                  <Link
                    className="sidebar-article"
                    key={resource.slug}
                    href={`/resources/${resource.slug}`}
                  >
                    <span className="resource-category">{resource.category}</span>
                    <h3>{resource.title}</h3>
                    <p>{resource.excerpt}</p>
                    <span className="sidebar-meta">{resource.meta}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </SiteChrome>
  );
}
