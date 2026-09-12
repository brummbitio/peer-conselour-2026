import {
  LatestPsychoeducationSection,
  WhoWeAreSection,
  LandingCTASection,
  SiteChrome,
} from "./components";
import HeroSection from "./HeroSection";
import AnimatedNewsSection from "./AnimatedNewsSection";
import { newsItems, toNewsSummaries } from "./data";

export const revalidate = 3600; // Cache static page for 1 hour (ISR)

export default function Home() {
  // Proyeksi dilakukan di server supaya isi artikel tidak ikut ke klien.
  const newsSummaries = toNewsSummaries(newsItems);

  return (
    <SiteChrome>
      <HeroSection />

      <AnimatedNewsSection items={newsSummaries} />
      <LatestPsychoeducationSection />
      <WhoWeAreSection />
      <LandingCTASection />
    </SiteChrome>
  );
}
