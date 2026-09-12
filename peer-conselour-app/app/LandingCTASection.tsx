"use client";

import React, { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

// Modal hanya muncul setelah interaksi -> keluarkan dari bundle awal.
// ssr:false aman karena komponen ini di-portal ke document.body saat mounted.
const StartCounselingModal = dynamic(() => import("./StartCounselingModal"), { ssr: false });

export function LandingCTASection() {
  const [isCounselingModalOpen, setIsCounselingModalOpen] = useState(false);

  return (
    <>
      <div className="landing-cta-wrapper">
        <div className="landing-cta-card">
          {/* Background Image from public/cta/cta-bg.webp */}
          <Image
            src="/cta/cta-bg.webp"
            alt="Ruang Aman Layanan Konseling UB"
            fill
            className="landing-cta-bg"
            priority={false}
          />
          {/* Dark Overlay Gradient */}
          <div className="landing-cta-overlay" />

          {/* Content Box */}
          <div className="landing-cta-content">
            <h2 className="landing-cta-title">
              Yuk, temukan ruang amanmu
            </h2>

            <button
              type="button"
              className="landing-cta-btn"
              onClick={() => setIsCounselingModalOpen(true)}
            >
              Mulai Konseling
            </button>
          </div>
        </div>
      </div>

      <StartCounselingModal
        open={isCounselingModalOpen}
        onClose={() => setIsCounselingModalOpen(false)}
      />
    </>
  );
}
