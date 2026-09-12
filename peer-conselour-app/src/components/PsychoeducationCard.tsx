"use client";

import React from "react";
import Image from "next/image";
import { ParticleCard } from "./MagicBento";
import "./PsychoeducationBento.css";

export interface PsychoeducationCardItem {
  slug: string;
  type: "video" | "presentasi" | "poster" | "instagram" | "buku";
  title: string;
  description?: string;
  thumbnail: string;
  publishedAt: string;
  externalUrl?: string;
  embedUrl?: string;
  slideCount?: number;
  slidePrefix?: string;
  pageCount?: number;
  fileSize?: string;
}

const ACTION_LABELS: Record<string, string> = {
  presentasi: "Buka Presentasi",
  poster: "Lihat Poster",
  video: "Tonton Video",
  buku: "Baca Buku Saku",
  instagram: "Buka Instagram",
};

const CATEGORY_LABELS: Record<string, string> = {
  presentasi: "PRESENTASI",
  poster: "POSTER",
  video: "VIDEO PSIKOEDUKASI",
  buku: "BUKU SAKU",
  instagram: "INSTAGRAM",
};

interface PsychoeducationCardProps {
  item: PsychoeducationCardItem;
  onClick: () => void;
  className?: string;
}

export function PsychoeducationCard({
  item,
  onClick,
  className = "",
}: PsychoeducationCardProps) {
  const actionLabel = ACTION_LABELS[item.type] || "Pelajari Lebih Lanjut";
  const categoryLabel = CATEGORY_LABELS[item.type] || item.type.toUpperCase();

  return (
    <ParticleCard
      enableStars={true}
      enableTilt={false}
      className={`magic-bento-card psycho-bento-grid-card ${className}`}
      motionProps={{
        initial: { opacity: 0, y: 25 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-40px" },
        transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="magic-bento-card__link"
        style={{
          background: "none",
          border: "none",
          padding: "1.15rem",
          textAlign: "left",
          cursor: "pointer",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div className="magic-bento-card__bg-wrap">
          <Image
            src={item.thumbnail}
            alt={item.title}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 340px"
            className="magic-bento-card__bg-image"
            loading="lazy"
          />
          <div className="magic-bento-card__overlay" />
        </div>

        <div className="magic-bento-card__header">
          <span className="magic-bento-card__badge">{categoryLabel}</span>
        </div>

        <div className="magic-bento-card__content">
          <h3 className="magic-bento-card__title">{item.title}</h3>
          <div className="magic-bento-card__footer">
            <span className="magic-bento-card__author">{item.publishedAt}</span>
            <span className="magic-bento-card__readmore">
              {actionLabel} &rarr;
            </span>
          </div>
        </div>
      </button>
    </ParticleCard>
  );
}
