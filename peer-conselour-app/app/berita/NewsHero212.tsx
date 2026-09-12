"use client";

import Link from "next/link";
import Image from "next/image";
import { ParticleCard } from "@/components/MagicBento";

export interface NewsItem {
  slug: string;
  category: string;
  title: string;
  meta: string;
  excerpt: string;
  image: string;
  author: string;
  publishedAt: string;
}

interface NewsHero212Props {
  items: NewsItem[];
}

export default function NewsHero212({ items }: NewsHero212Props) {
  if (!items || items.length === 0) return null;

  const featured = items[0];
  const leftItems = items.slice(1, 3);
  const rightItems = items.slice(3, 5);

  const renderBentoCard = (item: NewsItem, delay: number) => (
    <ParticleCard
      key={item.slug}
      enableStars={true}
      enableTilt={false}
      className="magic-bento-card news-hero-side-card"
      motionProps={{
        initial: { opacity: 0, y: 30, scale: 0.97 },
        whileInView: { opacity: 1, y: 0, scale: 1 },
        viewport: { once: true, margin: "-40px" },
        transition: {
          duration: 0.7,
          delay,
          ease: [0.16, 1, 0.3, 1],
        },
      }}
    >
      <Link
        href={`/berita/${item.slug}`}
        className="magic-bento-card__link"
        prefetch={false}
      >
        {/* Full Background Image */}
        <div className="magic-bento-card__bg-wrap">
          <Image
            src={item.image}
            alt={item.title}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 300px"
            className="magic-bento-card__bg-image"
            loading="lazy"
          />
          {/* Dark Gradient Overlay for Crisp Text Readability */}
          <div className="magic-bento-card__overlay" />
        </div>

        {/* Card Header (Category Badge) */}
        <div className="magic-bento-card__header">
          <span className="magic-bento-card__badge">{item.category}</span>
        </div>

        {/* Card Bottom Content (Title & Footer) */}
        <div className="magic-bento-card__content">
          <h3 className="magic-bento-card__title">{item.title}</h3>
          <div className="magic-bento-card__footer">
            <span className="magic-bento-card__author">{item.publishedAt}</span>
            <span className="magic-bento-card__readmore">
              Baca Selengkapnya &rarr;
            </span>
          </div>
        </div>
      </Link>
    </ParticleCard>
  );

  return (
    <div className="news-hero-212">
      {/* Kolom Kiri: 2 Kartu Bento (Desain Beranda) */}
      <div className="news-hero-col news-hero-col--side news-hero-col--left">
        {leftItems.map((item, idx) => renderBentoCard(item, idx * 0.12))}
      </div>

      {/* Kolom Tengah: 1 Kartu Editorial Featured (Desain Image 3) */}
      <div className="news-hero-col news-hero-col--center">
        <ParticleCard
          enableStars={false}
          enableTilt={false}
          className="news-hero-featured-wrap"
          motionProps={{
            initial: { opacity: 0, y: 35, scale: 0.97 },
            whileInView: { opacity: 1, y: 0, scale: 1 },
            viewport: { once: true, margin: "-40px" },
            transition: {
              duration: 0.75,
              delay: 0.15,
              ease: [0.16, 1, 0.3, 1],
            },
          }}
        >
          <Link
            href={`/berita/${featured.slug}`}
            className="news-hero-featured"
            prefetch={false}
          >
            <div className="news-hero-featured__media">
              <Image
                src={featured.image}
                alt={featured.title}
                fill
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 100vw, 520px"
                className="news-hero-featured__img"
                priority
              />
            </div>

            <div className="news-hero-featured__body">
              <div className="news-hero-featured__content">
                <div className="news-hero-featured__category">
                  {featured.category}
                </div>

                <h2 className="news-hero-featured__title">
                  {featured.title}
                </h2>

                <p className="news-hero-featured__excerpt">
                  {featured.excerpt}
                </p>
              </div>

              <div className="news-hero-featured__meta">
                <span>{featured.publishedAt}</span>
              </div>
            </div>
          </Link>
        </ParticleCard>
      </div>

      {/* Kolom Kanan: 2 Kartu Bento (Desain Beranda) */}
      <div className="news-hero-col news-hero-col--side news-hero-col--right">
        {rightItems.map((item, idx) => renderBentoCard(item, 0.24 + idx * 0.12))}
      </div>
    </div>
  );
}
