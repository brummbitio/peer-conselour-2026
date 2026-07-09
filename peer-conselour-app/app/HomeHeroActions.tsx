"use client";

import Link from "next/link";
import { useState } from "react";
import StartCounselingModal from "./StartCounselingModal";

export default function HomeHeroActions() {
  const [isCounselingModalOpen, setIsCounselingModalOpen] = useState(false);

  return (
    <>
      <div className="hero-actions hero-actions-centered">
        <button
          type="button"
          className="button button-primary"
          onClick={() => setIsCounselingModalOpen(true)}
        >
          Mulai Konseling
        </button>
        <Link className="button button-secondary" href="/resources">
          Lihat Psikoedukasi
        </Link>
      </div>

      <StartCounselingModal
        open={isCounselingModalOpen}
        onClose={() => setIsCounselingModalOpen(false)}
      />
    </>
  );
}
