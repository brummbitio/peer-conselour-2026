import Image from "next/image";

interface AboutHeroProps {
  title?: React.ReactNode;
  imageSrc?: string;
  imageAlt?: string;
}

export default function AboutHero({
  title = "Tentang Kami",
  imageSrc = "/about/LKM-85.jpg",
  imageAlt = "Tim Layanan Konseling Mahasiswa Universitas Brawijaya",
}: AboutHeroProps) {
  return (
    <div className="about-hero-full about-hero-wrapper">
      <section className="about-hero-curved">
        {/* Background Photo */}
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="about-hero-bg-img"
        />

        {/* Dark Gradient Scrim for High Contrast & Text Readability */}
        <div className="about-hero-scrim" />

        {/* Focused radial scrim behind copy */}
        <div className="about-hero-radial-scrim" aria-hidden="true" />

        {/* Subtle Ambient Light Gradients (Puncak Riverside style) */}
        <div className="about-hero-glow-1" aria-hidden="true" />
        <div className="about-hero-glow-2" aria-hidden="true" />

        {/* Content */}
        <div className="about-hero-content">
          <h1 className="about-hero-heading">
            {title}
          </h1>
        </div>
      </section>
    </div>
  );
}
