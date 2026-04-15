import { CTASection, PageIntro, SiteChrome, StepsSection } from "../components";

export default function BookSessionPage() {
  return (
    <SiteChrome>
      <PageIntro
        eyebrow="Book Session"
        title="Starting counseling should feel simple, not stressful."
        description="Our intake flow keeps things clear and gentle, so students can ask for support without extra pressure or confusion."
      />
      <StepsSection />

      <section className="section site-width">
        <div className="booking-layout">
          <article className="glass booking-card">
            <p className="eyebrow">Session options</p>
            <h2>Choose the format that feels most comfortable.</h2>
            <div className="feature-stack">
              <div className="feature-row">
                <strong>Online counseling</strong>
                <span>Private video sessions for convenience and flexibility.</span>
              </div>
              <div className="feature-row">
                <strong>On-campus appointments</strong>
                <span>A quiet, welcoming space in the student wellbeing center.</span>
              </div>
              <div className="feature-row">
                <strong>Urgent consultation</strong>
                <span>Priority routing for students needing faster support.</span>
              </div>
            </div>
          </article>

          <article className="glass booking-card accent-card">
            <p className="eyebrow">Availability</p>
            <h3>Monday to Friday</h3>
            <p>08.00 - 17.00 WIB</p>
            <h3>Response time</h3>
            <p>Usually within 24 hours for standard appointments.</p>
            <a className="button button-primary" href="mailto:support@unicounsel.edu">
              Request an Intake
            </a>
          </article>
        </div>
      </section>

      <CTASection />
    </SiteChrome>
  );
}
