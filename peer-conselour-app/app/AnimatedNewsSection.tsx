"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { MagicBento, type NewsItem } from "@/components/MagicBento";
import { useLiteMotion } from "@/hooks/use-lite-motion";

export default function AnimatedNewsSection({ items }: { items: NewsItem[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const liteMotion = useLiteMotion();

  // Parallax Scroll Tracking for News Section (Harmonized with Hero)
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
    <motion.section
      ref={sectionRef}
      className="section site-width editorial-section"
      style={{
        maxWidth: "1040px",
        margin: "0 auto",
        // Parallax hanya di desktop: di HP/tablet loop rAF-nya dimatikan.
        ...(liteMotion ? {} : { y: parallaxY }),
      }}
    >
      {/* Animated Heading */}
      <motion.div
        className="section-heading editorial-heading"
        style={{ marginBottom: "1.25rem" }}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <h2 style={{ fontSize: "clamp(1.5rem, 2.6vw, 2.15rem)" }}>
            Berita Terbaru
          </h2>
        </div>
      </motion.div>

      {/* Bento Grid with Per-Card Staggered Reveal */}
      <div>
        <MagicBento
          items={items}
          hrefBase="/berita/"
          disableAnimations={false}
          enableStars={true}
          enableMagnetism={false}
          enableTilt={false}
          enableSpotlight={false}
          enableBorderGlow={false}
          clickEffect={false}
        />
      </div>
    </motion.section>
  );
}
