import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { Instagram, Mail } from "lucide-react";
import Navigation from "./navigation";
import { counselors, newsItems, resources, services, steps } from "./data";

export function ServiceIcon({ type }: { type: string }) {
  if (type === "heart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20.5 4.8 13.8A4.9 4.9 0 0 1 12 7.1a4.9 4.9 0 0 1 7.2 6.7L12 20.5Z" />
      </svg>
    );
  }

  if (type === "spark") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 2 1.9 5.7L19.6 9l-5 3.6 1.9 5.7L12 14.8l-4.5 3.5 1.9-5.7-5-3.6 5.7-1.3L12 2Z" />
      </svg>
    );
  }

  if (type === "people") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM8 14c-3 0-5 1.6-5 3.5V20h10v-2.5C13 15.6 11 14 8 14Zm8 0c-.9 0-1.7.1-2.4.4 1.5.8 2.4 1.9 2.4 3.1V20h5v-2.5c0-1.9-2-3.5-5-3.5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 4 6v5c0 5 3.4 9.6 8 11 4.6-1.4 8-6 8-11V6l-8-4Zm0 5a3 3 0 1 1-3 3 3 3 0 0 1 3-3Zm0 11c-2.4-.8-4.2-2.9-5-5.5.9-.9 2.6-1.5 5-1.5s4.1.6 5 1.5c-.8 2.6-2.6 4.7-5 5.5Z" />
    </svg>
  );
}

export function SiteChrome({
  children,
  cleanBackground = false,
}: {
  children: ReactNode;
  cleanBackground?: boolean;
}) {
  return (
    <main className={`page-shell ${cleanBackground ? "page-shell-clean" : ""}`}>
      {!cleanBackground && <div className="ambient ambient-blue" />}
      {!cleanBackground && <div className="ambient ambient-red" />}

      <Navigation />

      {children}

      <footer className="footer-block">
        <div className="footer footer-wide">
          <div className="footer-top">
            <div className="footer-brand">
              <Image
                src="/branding/logo-konseling.png"
                alt="Logo Layanan Konseling"
                width={72}
                height={72}
                className="footer-logo"
              />
              <div>
                <p className="footer-title">Layanan Konseling</p>
                <p className="footer-desc">
                  Subdirektorat Konseling, Pencegahan Kekerasan Seksual, dan
                  Perundungan Universitas Brawijaya
                </p>
              </div>
            </div>

            <div className="footer-contact-row">
              <span className="footer-contact-label">Contact Us</span>
              <a className="footer-contact-item" href="mailto:konseling.ub@gmail.com">
                <span className="footer-icon" aria-hidden="true">
                  <Mail size={16} strokeWidth={2.1} />
                </span>
                konseling.ub@gmail.com
              </a>
              <a
                className="footer-contact-item"
                href="https://instagram.com/layanankonseling_ub"
                target="_blank"
                rel="noreferrer"
              >
                <span className="footer-icon" aria-hidden="true">
                  <Instagram size={16} strokeWidth={2.1} />
                </span>
                @layanankonseling_ub
              </a>
            </div>
          </div>
        </div>

        <div className="footer-divider footer-wide" />

        <div className="footer-bottom footer-wide">
          <p>© 2026 Layanan Konseling Universitas Brawijaya. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="section page-hero site-width">
      <div className="page-hero-card glass">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="hero-text">{description}</p>
      </div>
    </section>
  );
}

export function ServicesSection() {
  return (
    <section className="section site-width">
      <div className="section-heading">
        <p className="eyebrow">Services</p>
        <h2>Professional support for the moments that feel heavy</h2>
        <p>
          Thoughtfully designed care pathways for common student concerns, with
          warm guidance at every step.
        </p>
      </div>

      <div className="service-grid">
        {services.map((service) => (
          <article className="glass service-card" key={service.title}>
            <div className="service-icon">
              <ServiceIcon type={service.icon} />
            </div>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function StepsSection() {
  return (
    <section className="section section-alt site-width">
      <div className="section-heading">
        <p className="eyebrow">How it works</p>
        <h2>A simple process made to feel clear and reassuring</h2>
      </div>

      <div className="steps-grid">
        {steps.map((step) => (
          <article className="glass step-card" key={step.number}>
            <span className="step-number">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CounselorsSection() {
  return (
    <section className="section site-width">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">Meet the counselors</p>
          <h2>Friendly professionals who bring expertise with empathy</h2>
        </div>
        <p>
          Our team supports students with evidence-based care, academic insight,
          and a deeply human approach.
        </p>
      </div>

      <div className="counselor-grid">
        {counselors.map((counselor) => (
          <article className="glass counselor-card" key={counselor.name}>
            <div className={`counselor-photo ${counselor.accent}`}>
              <span>{counselor.name.slice(0, 1)}</span>
            </div>
            <h3>{counselor.name}</h3>
            <p>{counselor.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ResourcesSection() {
  return (
    <section className="section section-alt site-width">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">Resources</p>
          <h2>Helpful guides for everyday emotional wellbeing</h2>
        </div>
        <Link className="text-link" href="/resources">
          Explore all resources
        </Link>
      </div>

      <div className="resource-grid">
        {resources.map((resource) => (
          <article className="resource-card" key={resource.title}>
            <span className="resource-category">{resource.category}</span>
            <h3>{resource.title}</h3>
            <p className="resource-excerpt">{resource.excerpt}</p>
            <div className="resource-meta">
              <span>{resource.meta}</span>
              <Link href={`/resources/${resource.slug}`}>Read article</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function EditorialFeedSection({
  title,
  items,
  hrefBase,
  moreHref,
  variant = "default",
}: {
  title: string;
  items: Array<{
    slug: string;
    category: string;
    title: string;
    meta: string;
    excerpt: string;
    image: string;
    author: string;
    publishedAt: string;
  }>;
  hrefBase: string;
  moreHref: string;
  variant?: "default" | "headline-only" | "video-feed";
}) {
  const topItems = items.slice(0, 4);
  const isHeadlineOnly = variant === "headline-only";
  const isVideoStyle = variant === "video-feed";
  const featuredItems = isVideoStyle ? topItems.slice(0, 1) : topItems.slice(0, 2);
  const sideItems = isVideoStyle ? topItems.slice(1) : topItems.slice(2);
  const spotlight = items[0];

  return (
    <section className="section site-width editorial-section">
      <div className="section-heading editorial-heading">
        <div>
          <h2>{title}</h2>
        </div>
        <Link className="editorial-more" href={moreHref}>
          Lihat lainnya
        </Link>
      </div>

      <div className="editorial-top">
        <div className={`editorial-feature-grid ${isVideoStyle ? "editorial-feature-grid-single" : ""}`}>
          {featuredItems.map((item) => (
            <article
              className={`editorial-card ${isHeadlineOnly ? "editorial-card-plain" : ""} ${isVideoStyle ? "editorial-card-video" : ""}`}
              key={item.slug}
            >
              <Link href={`${hrefBase}${item.slug}`}>
                <div className="editorial-card-image-wrap">
                  <span className="editorial-image-tag resource-category">
                    {item.category}
                  </span>
                  <img
                    src={item.image}
                    alt={item.title}
                    className="editorial-card-image"
                  />
                </div>
                <div className="editorial-card-body">
                  <h3>{item.title}</h3>
                  {!isHeadlineOnly && !isVideoStyle && <p>{item.excerpt}</p>}
                  <div
                    className={`editorial-meta ${isHeadlineOnly ? "editorial-meta-tight" : ""} ${
                      isVideoStyle ? "editorial-meta-video" : ""
                    }`}
                  >
                    <span>{isHeadlineOnly || isVideoStyle ? item.publishedAt : item.author}</span>
                    {!isHeadlineOnly && !isVideoStyle && <span>{item.meta}</span>}
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="editorial-side-list">
          {sideItems.map((item) => (
            <article
              className={`editorial-side-item ${isHeadlineOnly || isVideoStyle ? "editorial-side-item-plain" : ""}`}
              key={item.slug}
            >
              <Link className="editorial-side-link" href={`${hrefBase}${item.slug}`}>
                <div className="editorial-side-thumb-wrap">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="editorial-side-thumb"
                  />
                </div>
                <div className="editorial-side-content">
                  <h3>{item.title}</h3>
                  <span>{isHeadlineOnly ? item.publishedAt : item.meta}</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>

      {!isHeadlineOnly && !isVideoStyle && (
        <article className="editorial-spotlight glass">
          <div className="editorial-spotlight-copy">
            <span className="resource-category">{spotlight.category}</span>
            <h3>{spotlight.title}</h3>
            <p>{spotlight.excerpt}</p>
            <div className="editorial-meta">
              <span>{spotlight.author}</span>
              <span>{spotlight.publishedAt}</span>
            </div>
            <Link className="button button-primary" href={`${hrefBase}${spotlight.slug}`}>
              Baca Selengkapnya
            </Link>
          </div>

          <Link className="editorial-spotlight-media" href={`${hrefBase}${spotlight.slug}`}>
            <img
              src={spotlight.image}
              alt={spotlight.title}
              className="editorial-spotlight-image"
            />
          </Link>
        </article>
      )}
    </section>
  );
}

export function LatestNewsSection() {
  return (
    <EditorialFeedSection
      title="Berita Terbaru"
      items={newsItems}
      hrefBase="/news#"
      moreHref="/news"
      variant="headline-only"
    />
  );
}

export function LatestPsychoeducationSection() {
  return (
    <EditorialFeedSection
      title="Psikoedukasi Terbaru"
      items={resources}
      hrefBase="/resources/"
      moreHref="/resources"
      variant="video-feed"
    />
  );
}

export function CTASection() {
  return (
    <section className="section site-width">
      <div className="glass callout">
        <div>
          <p className="eyebrow">Ready when you are</p>
          <h2>Taking the first step can be gentle.</h2>
          <p>
            Connect with our counseling team and choose the support format that
            feels most comfortable for you.
          </p>
        </div>
        <Link className="button button-primary" href="/contact">
          Start Your Intake
        </Link>
      </div>
    </section>
  );
}
