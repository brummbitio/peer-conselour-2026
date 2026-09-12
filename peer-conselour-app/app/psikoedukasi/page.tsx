"use client";

import { SiteChrome, LandingCTASection } from "../components";
import { psikoedulasiItems } from "../data";
import PsikoedulasiGrid from "./PsikoedulasiGrid";
import { PsychoeducationBento } from "@/components/PsychoeducationBento";
import "../styles/content-pages.css";

export default function PsikoedukasiPage() {
  return (
    <SiteChrome>
      <section className="section site-width psiko-page" style={{ paddingTop: "24px" }}>
        {/* Top Hero Section: Full width Bento Grid without "Lihat selengkapnya" banner and without title */}
        <PsychoeducationBento hideBanner={true} isHero={true} showTitle={false} />

        {/* Section Psikoedukasi Lainnya — dengan jarak lega dari Hero */}
        <div style={{ marginTop: "4.5rem" }}>
          <PsikoedulasiGrid items={psikoedulasiItems} />
        </div>
      </section>

      {/* CTA Section above footer matching home page */}
      <LandingCTASection />
    </SiteChrome>
  );
}
