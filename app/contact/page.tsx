import { PageIntro, SiteChrome } from "../components";

export default function ContactPage() {
  return (
    <SiteChrome>
      <PageIntro
        eyebrow="Contact"
        title="Reach out in the way that feels easiest for you."
        description="Whether you are ready to book, have a question, or need urgent guidance, our team is here to help students connect with the right support."
      />

      <section className="section site-width">
        <div className="contact-grid">
          <article className="glass info-panel">
            <p className="eyebrow">Contact details</p>
            <div className="feature-stack">
              <div className="feature-row">
                <strong>Email</strong>
                <span>support@unicounsel.edu</span>
              </div>
              <div className="feature-row">
                <strong>Phone</strong>
                <span>+62 21 555 9087</span>
              </div>
              <div className="feature-row">
                <strong>Office hours</strong>
                <span>Monday to Friday, 08.00 - 17.00 WIB</span>
              </div>
            </div>
          </article>

          <article className="glass info-panel">
            <p className="eyebrow">Visit us</p>
            <h2>Student Wellbeing Building</h2>
            <p>
              Ground Floor, University Main Campus. Quiet waiting area available
              for students arriving early for appointments.
            </p>
            <a className="button button-primary" href="mailto:support@unicounsel.edu">
              Email the Team
            </a>
          </article>
        </div>
      </section>
    </SiteChrome>
  );
}
