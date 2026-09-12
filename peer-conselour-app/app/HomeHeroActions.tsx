"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Modal hanya muncul setelah interaksi -> keluarkan dari bundle awal.
// ssr:false aman karena komponen ini di-portal ke document.body saat mounted.
const StartCounselingModal = dynamic(() => import("./StartCounselingModal"), { ssr: false });

export default function HomeHeroActions() {
  const [isCounselingModalOpen, setIsCounselingModalOpen] = useState(false);

  return (
    <>
      <div className="hero-actions hero-actions-centered">
        <motion.button
          type="button"
          className="button button-primary"
          onClick={() => setIsCounselingModalOpen(true)}
          whileHover={{ scale: 1.04, translateY: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          Mulai Konseling
        </motion.button>
      </div>

      <StartCounselingModal
        open={isCounselingModalOpen}
        onClose={() => setIsCounselingModalOpen(false)}
      />
    </>
  );
}
