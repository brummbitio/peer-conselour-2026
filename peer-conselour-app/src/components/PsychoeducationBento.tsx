"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { ParticleCard } from "./MagicBento";
import { useLiteMotion } from "@/hooks/use-lite-motion";
import "./PsychoeducationBento.css";

const MotionLink = motion(Link);

import dynamic from "next/dynamic";
import type { ArticleData } from "./ArticleModal";

const ArticleModal = dynamic(
  () => import("./ArticleModal").then((m) => m.ArticleModal),
  { ssr: false }
);
import { PsychoeducationCard } from "./PsychoeducationCard";

const ARTICLES_DATA: Record<string, ArticleData> = {
  video: {
    type: "video",
    category: "VIDEO PSIKOEDUKASI",
    title: "Mengenal Layanan Konseling & Ruang Aman Kesejahteraan Mahasiswa UB",
    description:
      "Mengenal layanan konseling sebaya dan ruang aman tanpa penghakiman bagi kesejahteraan mental mahasiswa Universitas Brawijaya.",
    image: "/articles/video-psikoedukasi-cover.jpg",
    publishedAt: "15 April 2026",
    embedUrl: "https://www.youtube.com/embed/5sMSacJgpxA?autoplay=1&si=OlKtG6ktVdUeKznK",
  },
  ppt: {
    type: "presentasi",
    category: "PRESENTASI",
    title: "Strategi Manajemen Diri dan Belajar Mahasiswa",
    description:
      "Panduan praktis strategi coping, manajemen waktu, dan self-compassion untuk kehidupan akademik yang lebih seimbang.",
    image: "/articles/slides/slide-1.jpg",
    publishedAt: "10 April 2026",
    embedUrl: "/articles/strategi-manajemen-diri.pdf#toolbar=0",
    slideCount: 17,
    slidePrefix: "/articles/slides/slide-",
    slideWidth: 1500,
    slideHeight: 1125,
  },
  buku: {
    type: "buku",
    category: "BUKU SAKU",
    title: "Panduan Pemberian Psychological First Aid (PFA) Kepada Mahasiswa UB",
    description:
      "Buku saku panduan dukungan psikologis awal (PFA) bagi mahasiswa dan peer counselor Universitas Brawijaya untuk merespons situasi krisis dan mengurangi distres emosional.",
    image: "/articles/cover-buku-panduan-pfa.jpg",
    publishedAt: "Cetakan 2022",
    slideCount: 32,
    slidePrefix: "/articles/buku-pfa/slide-",
    slideWidth: 1040,
    slideHeight: 1478,
  },
};


export interface PsychoeducationBentoProps {
  hideBanner?: boolean;
  isHero?: boolean;
  showTitle?: boolean;
}

export function PsychoeducationBento({
  hideBanner = false,
  isHero = false,
  showTitle = true,
}: PsychoeducationBentoProps = {}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const liteMotion = useLiteMotion();
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [activeArticle, setActiveArticle] = useState<ArticleData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parallax Scroll Tracking for Psychoeducation Section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Subtle Parallax Y Lift as user scrolls down
  const parallaxY = useTransform(smoothProgress, [0, 1], ["24px", "-24px"]);

  return (
    <>
      <motion.section
        ref={sectionRef}
        className={isHero ? "psycho-section psycho-section--hero" : "section site-width psycho-section"}
        style={{
          maxWidth: isHero ? "100%" : "1040px",
          width: "100%",
          margin: isHero ? "0" : "0 auto",
          ...(isHero
            ? { paddingTop: 0, paddingBottom: 0 }
            : liteMotion
              ? {}
              : { y: parallaxY }),
        }}
      >
        {/* Animated Heading */}
        {showTitle && (
          <motion.div
            className="section-heading editorial-heading"
            style={{ marginBottom: "1rem" }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <div>
              <h2 style={{ fontSize: "clamp(1.5rem, 2.6vw, 2.15rem)" }}>
                Psikoedukasi Terbaru
              </h2>
            </div>
          </motion.div>
        )}

        <div className="card-grid psycho-bento-grid">
          {/* Card 1: Hero Video Card (Delay: 0s) - YouTube Facade Pattern */}
          <motion.div
            className="psycho-video-card psycho-bento-card--video"
            initial={{ opacity: 0, y: 35, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.75,
              delay: 0,
              ease: [0.16, 1, 0.3, 1] as const,
            }}
          >
            <div className="psycho-bento-video__wrapper">
              {!isPlayingVideo ? (
                <button
                  type="button"
                  onClick={() => setIsPlayingVideo(true)}
                  className="psycho-bento-video__facade"
                  aria-label="Putar Video Psikoedukasi"
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    background: "#0f172a",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src="/articles/video-psikoedukasi-cover.jpg"
                    alt="Thumbnail Video Psikoedukasi UB"
                    fill
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 100vw, 690px"
                    style={{ objectFit: "cover", opacity: 0.95 }}
                    priority
                  />
                  <div
                    style={{
                      position: "relative",
                      zIndex: 2,
                      width: "68px",
                      height: "48px",
                      borderRadius: "14px",
                      background: "rgba(209, 41, 40, 0.92)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 8px 25px rgba(209, 41, 40, 0.5)",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              ) : (
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/5sMSacJgpxA?autoplay=1&si=OlKtG6ktVdUeKznK"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="psycho-bento-video__iframe"
                />
              )}
            </div>
            <div className="psycho-bento-video__info">
              <div className="magic-bento-card__header">
                <span className="magic-bento-card__badge">VIDEO PSIKOEDUKASI</span>
              </div>
              <h3 className="magic-bento-card__title">
                Mengenal Layanan Konseling &amp; Ruang Aman Kesejahteraan Mahasiswa UB
              </h3>
            </div>
          </motion.div>

          {/* Card 2: Article 1 - Presentasi PPT (Opens PPT Modal) */}
          <ParticleCard
            enableStars={true}
            enableTilt={false}
            className="magic-bento-card psycho-bento-card--article-1"
            motionProps={{
              initial: { opacity: 0, y: 35, scale: 0.96 },
              whileInView: { opacity: 1, y: 0, scale: 1 },
              viewport: { once: true, margin: "-50px" },
              transition: {
                duration: 0.75,
                delay: 0.14,
                ease: [0.16, 1, 0.3, 1] as const,
              },
            }}
          >
            <button
              type="button"
              onClick={() => setActiveArticle(ARTICLES_DATA.ppt)}
              className="magic-bento-card__link"
              style={{
                background: "none",
                border: "none",
                padding: "1.15rem",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div className="magic-bento-card__bg-wrap">
                <Image
                  src={ARTICLES_DATA.ppt.image}
                  alt={ARTICLES_DATA.ppt.title}
                  fill
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 340px"
                  className="magic-bento-card__bg-image"
                  loading="lazy"
                />
                <div className="magic-bento-card__overlay" />
              </div>

              <div className="magic-bento-card__header">
                <span className="magic-bento-card__badge">PRESENTASI</span>
              </div>

              <div className="magic-bento-card__content">
                <h3 className="magic-bento-card__title">
                  Strategi Manajemen Diri dan Belajar Mahasiswa
                </h3>
                <div className="magic-bento-card__footer">
                  <span className="magic-bento-card__author">10 April 2026</span>
                  <span className="magic-bento-card__readmore">
                    Buka Presentasi &rarr;
                  </span>
                </div>
              </div>
            </button>
          </ParticleCard>

          {/* Card 3: Article 2 - Buku Saku (Opens PFA Modal) */}
          <ParticleCard
            enableStars={true}
            enableTilt={false}
            className="magic-bento-card psycho-bento-card--article-2"
            motionProps={{
              initial: { opacity: 0, y: 35, scale: 0.96 },
              whileInView: { opacity: 1, y: 0, scale: 1 },
              viewport: { once: true, margin: "-50px" },
              transition: {
                duration: 0.75,
                delay: 0.28,
                ease: [0.16, 1, 0.3, 1] as const,
              },
            }}
          >
            <button
              type="button"
              onClick={() => setActiveArticle(ARTICLES_DATA.buku)}
              className="magic-bento-card__link"
              style={{
                background: "none",
                border: "none",
                padding: "1.15rem",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div className="magic-bento-card__bg-wrap">
                <Image
                  src={ARTICLES_DATA.buku.image}
                  alt={ARTICLES_DATA.buku.title}
                  fill
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 340px"
                  className="magic-bento-card__bg-image"
                  loading="lazy"
                />
                <div className="magic-bento-card__overlay" />
              </div>

              <div className="magic-bento-card__header">
                <span className="magic-bento-card__badge">BUKU SAKU</span>
              </div>

              <div className="magic-bento-card__content">
                <h3 className="magic-bento-card__title">
                  {ARTICLES_DATA.buku.title}
                </h3>
                <div className="magic-bento-card__footer">
                  <span className="magic-bento-card__author">Cetakan 2022</span>
                  <span className="magic-bento-card__readmore">
                    Baca Buku Saku &rarr;
                  </span>
                </div>
              </div>
            </button>
          </ParticleCard>

          {/* Card 4: Banner Card (Delay: 0.42s) - Hidden when hideBanner is true */}
          {!hideBanner && (
            <MotionLink
              href="/psikoedukasi"
              className="magic-bento-card magic-bento-card--banner psycho-bento-card--banner"
              initial={{ opacity: 0, y: 35, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.75,
                delay: 0.42,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
            >
              <div className="magic-bento-banner__content">
                <h3 className="magic-bento-banner__title">Lihat selengkapnya</h3>
              </div>
              <div className="magic-bento-banner__btn">
                <ArrowRight size={20} className="magic-bento-banner__icon" />
              </div>
            </MotionLink>
          )}
        </div>
      </motion.section>

      {/* Pop-up Article Modal Portal */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {activeArticle && (
              <ArticleModal
                article={activeArticle}
                onClose={() => setActiveArticle(null)}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
