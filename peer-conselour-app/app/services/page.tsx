import { CTASection, PageIntro, ServicesSection, SiteChrome } from "../components";
import "../styles/content-pages.css";


export default function ServicesPage() {
  return (
    <SiteChrome>
      <PageIntro
        eyebrow="Services"
        title="Support options shaped around student realities."
        description="From counseling sessions to academic pressure support and urgent care guidance, each service is designed to feel approachable, private, and genuinely helpful."
      />
      <ServicesSection />
      <CTASection />
    </SiteChrome>
  );
}
