import type { Metadata } from "next";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "IB Mathematics tutoring", description: "Contact Mr Flynn IB for information about IB Mathematics tutoring." };

export default function TutoringPage() {
  return (
    <section className="tutoring-contact-page">
      <Container className="tutoring-contact-shell">
        <div className="stack-lg tutoring-contact-copy">
          <Breadcrumbs items={[{ label: "Tutoring" }]} />
          <Eyebrow>Private tutoring enquiries</Eyebrow>
          <h1>Ask about individual IB Mathematics support.</h1>
          <p className="lede">For current information about tutoring, email <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.</p>
          <ButtonLink href="/go/tutoring-email">Email Mr Flynn IB</ButtonLink>
        </div>
        <aside className="tutoring-enquiry-note">
          <small>To help us reply usefully</small>
          <strong>Please include:</strong>
          <ul><li>The student&apos;s IB Mathematics course</li><li>The area where support is needed</li><li>The student&apos;s time zone</li></ul>
        </aside>
      </Container>
    </section>
  );
}
