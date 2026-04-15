import { SiteChrome } from "../components";
import DomeGallery from "../../src/componentcomponents/ui/DomeGallery.jsx";
import TeamGrid from "./TeamGrid";

const aboutGalleryImages = [
  { src: "/hero/hero-photo.webp", alt: "Ruang dukungan yang tenang" },
  { src: "/articles/gentle-reset.svg", alt: "Materi pemulihan diri" },
  { src: "/articles/ask-for-help.svg", alt: "Ajakan mencari bantuan" },
  { src: "/articles/exam-anxiety.svg", alt: "Psikoedukasi kecemasan ujian" },
  { src: "/posters/poster-1.png", alt: "Poster strategi belajar efektif" },
  { src: "/branding/logo-konseling.png", alt: "Logo layanan konseling" },
];

export default function AboutPage() {
  return (
    <SiteChrome>
      <section className="section about-hero-shell about-hero-full">
        <div className="about-hero-card about-hero-card-full">
          <div className="about-hero-visual">
            <div className="about-hero-title">
              <p>Tentang Kami</p>
            </div>
            <div className="about-hero-blocker" aria-hidden="true" />
            <div className="about-dome">
              <DomeGallery
                images={aboutGalleryImages}
                fit={0.8}
                minRadius={600}
                maxVerticalRotationDeg={0}
                segments={34}
                dragDampening={2}
                interactive={false}
                grayscale
                imageBorderRadius="26px"
                overlayBlurColor="rgba(255,255,255,0.98)"
                overlayBlurStrength={0}
                autoRotateSpeed={0.08}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section site-width">
        <div className="bento-grid">
          <article className="bento-card">
            <h3 className="bento-title">Layanan Konseling Tatap Muka dan Online</h3>
            <ol className="bento-list">
              <li>Kekerasan Seksual dan Perundungan</li>
              <li>Akademik</li>
              <li>Pribadi</li>
              <li>Keluarga</li>
              <li>Sosial</li>
              <li>Karier</li>
              <li>Bakat minat</li>
            </ol>
          </article>

          <article className="bento-card">
            <h3 className="bento-title">Layanan Pelatihan dan Psikoedukasi</h3>
            <ol className="bento-list">
              <li>Pelatihan dosen penasihat akademik</li>
              <li>Pelatihan psychological first aid</li>
              <li>Pelatihan Peer Counselor</li>
              <li>Pelatihan pencegahan dan penanganan kekerasan seksual dan perundungan</li>
              <li>Webinar series tentang peningkatan kesehatan mental dan pengembangan diri</li>
            </ol>
          </article>

          <article className="bento-card">
            <h3 className="bento-title">Layanan Konsultasi dan Pendampingan</h3>
            <ol className="bento-list">
              <li>Kekerasan Seksual dan Perundungan</li>
              <li>Akademik</li>
              <li>Pribadi</li>
              <li>Keluarga</li>
              <li>Sosial</li>
              <li>Karier</li>
            </ol>
          </article>

          <article className="bento-card">
            <h3 className="bento-title">Layanan Peer Counselor</h3>
            <p className="bento-desc">
              Bimbingan dan Konseling oleh teman sebaya yang telah mendapatkan
              pelatihan peer counselor.
            </p>
          </article>
        </div>
      </section>

      <section className="section about-team-section">
        <div className="about-team-header site-width">
          <h2>Orang-orang di balik layanan konseling UB</h2>
        </div>
        <TeamGrid />
      </section>
    </SiteChrome>
  );
}
