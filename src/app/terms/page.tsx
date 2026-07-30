import type { Metadata } from "next";
import { Container, PageHero } from "@/components/ui";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms for using the Mr Flynn IB website and courses.",
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        breadcrumbLabel="Terms of use"
        title="Terms of use"
        intro="The straightforward terms that apply when you use Mr Flynn IB."
      />
      <section className="section-tight">
        <Container className="narrow stack-xl">
          <p className="muted"><strong>Last updated:</strong> 30 July 2026</p>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>About these terms</h2>
            <p>Mr Flynn IB is operated by Robert Flynn. By using this website, you agree to these terms. If you are under 18, a parent or guardian should review any purchase or paid service with you.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Courses and Teachable</h2>
            <p>Course checkout, payment, enrollment, account login and lesson delivery take place through Teachable. The price, access period and other important purchase information are shown before checkout. Teachable&apos;s applicable checkout terms and refund process also apply to purchases made on its platform.</p>
            <p>Mr Flynn IB remains responsible for the course content and reasonable course support. For help with an enrollment or course, email <a className="text-link" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Permitted use</h2>
            <p>The website, courses, videos, explanations, downloads, branding and original materials are protected by intellectual-property rights. You may use materials for your own learning or teaching as expressly allowed. You may not copy, publish, distribute, sell or commercially exploit them without written permission.</p>
            <p>Do not attempt to disrupt the website, gain unauthorised access, misuse another person&apos;s account or interfere with other users. Access may be suspended where these terms are seriously or repeatedly breached.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Educational information</h2>
            <p>Mr Flynn IB provides independent educational support and is not affiliated with or endorsed by the International Baccalaureate Organization. No particular grade, examination result, university offer or other outcome is guaranteed.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Tutoring and schools</h2>
            <p>The tutoring page invites enquiries only. School prices are published on the Schools page, while availability, final student allocation, invoicing and practical arrangements are confirmed separately in writing.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Availability and external services</h2>
            <p>We aim to keep the website accurate and available, but temporary errors, maintenance or service interruptions may occur. Links to Teachable, YouTube, Amazon and other external services lead to platforms with their own terms and privacy practices.</p>
            <p>Nothing in these terms excludes or limits a right or responsibility that cannot lawfully be excluded. To the extent permitted by law, Mr Flynn IB is not responsible for indirect losses arising solely from use of, or inability to use, the website.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Contact</h2>
            <p>Questions about these terms can be sent to <a className="text-link" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Changes</h2>
            <p>We may update these terms when the website or services change. The latest version will be published on this page.</p>
          </section>
        </Container>
      </section>
    </>
  );
}
