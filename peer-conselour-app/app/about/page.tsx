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

const FAQ_ITEMS = [
  {
    question: "Apa itu layanan psikoedukasi?",
    answer:
      "Psikoedukasi adalah materi edukatif yang membantu mahasiswa memahami kesehatan mental, strategi coping, relasi yang sehat, dan langkah mencari bantuan secara lebih dini.",
  },
  {
    question: "Apakah saya harus mengikuti konseling dulu untuk mengakses materi ini?",
    answer:
      "Tidak. Seluruh materi psikoedukasi dapat diakses secara mandiri sebagai sumber belajar awal, baik sebelum, selama, maupun tanpa sesi konseling.",
  },
  {
    question: "Apa bedanya materi video, presentasi, poster, dan Instagram?",
    answer:
      "Video cocok untuk penjelasan yang lebih naratif, presentasi berisi materi terstruktur, poster merangkum poin cepat, dan konten Instagram dirancang untuk edukasi singkat yang mudah dibagikan.",
  },
  {
    question: "Kapan saya sebaiknya lanjut menghubungi layanan konseling?",
    answer:
      "Jika kamu merasa kewalahan berkepanjangan, sulit fokus, cemas berlebihan, atau membutuhkan pendampingan yang lebih personal, kamu bisa lanjut menghubungi layanan konseling kampus.",
  },
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

      <section className="section about-team-section">
        <div className="about-team-header site-width">
          <h2>Orang-orang di balik layanan konseling UB</h2>
        </div>
        <TeamGrid />
      </section>

      <section className="section site-width about-faq-section">
        <div className="psiko-faq-heading">
          <h2>FAQ</h2>
        </div>

        <div className="psiko-faq-list">
          {FAQ_ITEMS.map((item) => (
            <details className="psiko-faq-item" key={item.question}>
              <summary>
                <span>{item.question}</span>
                <span className="psiko-faq-icon" aria-hidden="true">
                  +
                </span>
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </SiteChrome>
  );
}
