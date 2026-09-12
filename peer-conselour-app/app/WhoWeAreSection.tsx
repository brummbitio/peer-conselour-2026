"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

export function WhoWeAreSection() {
  const [isMuted, setIsMuted] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  // Mobile & tablet detection for sticky pin bypass.
  // Pinning 250vh hanya dipakai di desktop (>= 1024px); di tablet & HP
  // dipakai alur scroll natural supaya teks dan video tetap seimbang
  // secara vertikal dan tidak memakan 2,5 layar.
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Video baru diunduh saat section mendekati viewport, lalu di-pause
  // begitu keluar layar. Sebelum itu yang tampil hanya poster (16 KB),
  // sehingga beranda tidak lagi menarik file video di pemuatan awal.
  useEffect(() => {
    const videoNode = videoRef.current;
    if (!videoNode) return;

    const nearObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoadVideo(true);
          nearObserver.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    nearObserver.observe(videoNode);

    // GPU/CPU saver: hentikan dekode video saat tidak terlihat.
    const playObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoNode.play().catch(() => {});
          } else {
            videoNode.pause();
          }
        });
      },
      { threshold: 0.15 }
    );
    playObserver.observe(videoNode);

    return () => {
      nearObserver.disconnect();
      playObserver.disconnect();
    };
    // `isMobile` wajib jadi dependensi: komponen merender <video> yang
    // BERBEDA untuk cabang mobile dan desktop. Tanpa ini observer tetap
    // menempel pada node cabang pertama yang sudah dilepas dari DOM,
    // sehingga video tidak pernah dimuat maupun di-pause.
  }, [isMobile]);

  // Track scroll progress across sticky container (desktop)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 25,
    restDelta: 0.001,
  });

  // Tahap 1: Teks "SIAPA KAMI" membesar (scale 0 -> 1) di tengah layar
  const textScale = useTransform(smoothProgress, [0.05, 0.3], [0, 1]);
  const textOpacity = useTransform(smoothProgress, [0.05, 0.25], [0, 1]);

  // Tahap 2: Teks meluncur naik dari tengah layar ke atas posisi background
  const textY = useTransform(smoothProgress, [0.32, 0.58], [0, -220]);

  // Tahap 3: Video Card membesar (scale 0 -> 1) di bawah teks
  const videoScale = useTransform(smoothProgress, [0.58, 0.88], [0, 1]);
  const videoOpacity = useTransform(smoothProgress, [0.58, 0.78], [0, 1]);
  const videoY = useTransform(smoothProgress, [0.58, 0.88], [30, 0]);

  const toggleSound = () => {
    if (!videoRef.current) return;
    const newMutedState = !videoRef.current.muted;
    videoRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
  };

  // On Mobile: Use natural scroll without 250vh pinning
  if (isMobile) {
    return (
      <section className="who-we-are-section" style={{ margin: "4rem auto" }}>
        <motion.div
          className="who-we-are-bg-text"
          aria-hidden="true"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          style={{ top: "-1rem" }}
        >
          SIAPA KAMI
        </motion.div>

        <motion.div
          className="who-we-are-card"
          initial={{ opacity: 0, y: 35, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="who-we-are-video-wrapper">
            <video
              ref={videoRef}
              src={shouldLoadVideo ? "/video/who-we-are-720.mp4" : undefined}
              poster="/video/who-we-are-poster.jpg"
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              className="who-we-are-html5-video"
            />

            <button
              type="button"
              onClick={toggleSound}
              aria-label={isMuted ? "Aktifkan Suara" : "Matikan Suara"}
              className="who-we-are-sound-btn"
            >
              {isMuted ? (
                <>
                  <VolumeX size={18} />
                  <span>Suara Mati</span>
                </>
              ) : (
                <>
                  <Volume2 size={18} />
                  <span>Suara Aktif</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </section>
    );
  }

  // Desktop: Sticky Pinning 250vh
  return (
    <div ref={targetRef} style={{ height: "250vh", position: "relative" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <section className="who-we-are-section">
          <motion.div
            className="who-we-are-bg-text"
            aria-hidden="true"
            style={{
              opacity: textOpacity,
              scale: textScale,
              y: textY,
            }}
          >
            SIAPA KAMI
          </motion.div>

          <motion.div
            className="who-we-are-card"
            style={{
              opacity: videoOpacity,
              scale: videoScale,
              y: videoY,
            }}
          >
            <div className="who-we-are-video-wrapper">
              <video
                ref={videoRef}
                src={shouldLoadVideo ? "/video/who-we-are-720.mp4" : undefined}
                poster="/video/who-we-are-poster.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="none"
                className="who-we-are-html5-video"
              />

              <motion.button
                type="button"
                onClick={toggleSound}
                aria-label={isMuted ? "Aktifkan Suara" : "Matikan Suara"}
                className="who-we-are-sound-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isMuted ? (
                  <>
                    <VolumeX size={18} />
                    <span>Suara Mati</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={18} />
                    <span>Suara Aktif</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
