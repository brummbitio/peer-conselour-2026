import Image from "next/image";
import {
  LatestNewsSection,
  LatestPsychoeducationSection,
  SiteChrome,
} from "./components";
import HomeHeroActions from "./HomeHeroActions";

export default function Home() {
  return (
    <SiteChrome>
      <section className="hero-full">
        <section className="hero hero-full-bleed">
          <div className="hero-full-media">
            <Image
              src="/hero/hero-photo.webp"
              alt="Pemandangan tenang untuk layanan konseling"
              fill
              priority
              className="hero-full-image"
            />
            <div className="hero-full-topfade" />
            <div className="hero-full-overlay" />
          </div>

          <div className="hero-full-content site-width">
            <div className="hero-copy hero-copy-centered hero-copy-overlay">
              <p className="hero-kicker">
                Subdirektorat
              </p>
              <h1>
                Konseling, Pencegahan Kekerasan Seksual, dan Perundungan
              </h1>
              <p className="hero-subkicker">Universitas Brawijaya</p>
              <p className="hero-text">
                Unit kemahasiswaan yang menyediakan layanan konseling,
                psikoedukasi, dan pelatihan untuk mendukung kesejahteraan serta
                performa akademik mahasiswa, sekaligus pencegahan dan
                pendampingan kasus kekerasan seksual serta perundungan di
                Universitas Brawijaya.
              </p>

              <HomeHeroActions />
            </div>
          </div>
        </section>
      </section>

      <LatestNewsSection />
      <LatestPsychoeducationSection />
    </SiteChrome>
  );
}
