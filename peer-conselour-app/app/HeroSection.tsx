"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import HomeHeroActions from "./HomeHeroActions";
import { useLiteMotion } from "@/hooks/use-lite-motion";

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  const liteMotion = useLiteMotion();

  // Scroll tracking with physics spring for smooth parallax
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Parallax scroll transforms
  const bgY = useTransform(smoothProgress, [0, 1], ["0%", "22%"]);
  const scrollScale = useTransform(smoothProgress, [0, 1], [1, 1.08]);

  // Content scroll transforms
  const contentY = useTransform(smoothProgress, [0, 1], ["0px", "55px"]);
  const contentOpacity = useTransform(smoothProgress, [0, 0.65], [1, 0]);

  // Text Entrance variants (Delayed until background initial scale is underway)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.45,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.75,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <section ref={containerRef} className="hero-full">
      <section className="hero hero-full-bleed">
        {/* MEDIA CONTAINER */}
        <div className="hero-full-media">
          {/* Outer Layer: Scroll Parallax */}
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              // Di HP/tablet parallax latar dimatikan: menganimasikan
              // tekstur sebesar layar tiap frame adalah sumber jank utama.
              ...(liteMotion ? {} : { y: bgY, scale: scrollScale }),
            }}
          >
            {/* Inner Layer: Initial Mount Cinematic Scale Reveal */}
            <motion.div
              initial={{ scale: 1.08 }}
              animate={{ scale: 1.0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <Image
                src="/hero/hero-bg.webp"
                alt="Pemandangan tenang untuk layanan konseling"
                fill
                priority
                className="hero-full-image"
              />
            </motion.div>
          </motion.div>

          {/* Fixed Gradient Overlay for perfect Navbar blending (Navbar untouched) */}
          <div className="hero-full-topfade" />
          <div className="hero-full-overlay" />
        </div>

        {/* HERO CONTENT */}
        <div className="hero-full-content site-width">
          <motion.div
            className="hero-copy hero-copy-centered hero-copy-overlay"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={liteMotion ? undefined : { y: contentY, opacity: contentOpacity }}
          >
            <motion.p variants={itemVariants} className="hero-kicker">
              SUBDIREKTORAT
            </motion.p>
            <motion.h1 variants={itemVariants}>
              Konseling, Pencegahan Kekerasan Seksual, dan Perundungan
            </motion.h1>
            <motion.p variants={itemVariants} className="hero-subkicker">
              UNIVERSITAS BRAWIJAYA
            </motion.p>
            <motion.p variants={itemVariants} className="hero-text">
              Layanan konseling, psikoedukasi, serta pencegahan dan penanganan
              kekerasan seksual &amp; perundungan bagi mahasiswa Universitas
              Brawijaya.
            </motion.p>

            <motion.div variants={itemVariants}>
              <HomeHeroActions />
            </motion.div>
          </motion.div>
        </div>
      </section>
    </section>
  );
}
