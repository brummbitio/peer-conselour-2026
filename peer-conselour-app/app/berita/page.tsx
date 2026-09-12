import { SiteChrome, LandingCTASection } from "../components";
import { newsItems, toNewsSummaries } from "../data";
import NewsGrid from "./NewsGrid";
import NewsHero212 from "./NewsHero212";
import "../styles/content-pages.css";

export default function NewsPage() {
  const newsSummaries = toNewsSummaries(newsItems);
  const heroItems = newsSummaries.slice(0, 5);
  const otherItems = newsSummaries.slice(5);

  return (
    <SiteChrome>
      <section className="section site-width news-page" style={{ paddingTop: "24px" }}>
        <NewsHero212 items={heroItems} />

        <NewsGrid items={otherItems} />
      </section>

      {/* CTA Section above footer matching home & psikoedukasi pages */}
      <LandingCTASection />
    </SiteChrome>
  );
}
