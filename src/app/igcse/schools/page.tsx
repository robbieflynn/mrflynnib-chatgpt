import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "IGCSE Mathematics for schools", description: "Ask about IGCSE Mathematics course support for schools and departments." };

export default function IgcseSchoolsPage() {
  return (
    <section className="section igcse-school-form-section">
      <Container className="stack-xl">
        <Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Schools" }]} />
        <div className="split">
          <div className="stack-lg"><Eyebrow>School enquiries</Eyebrow><h1>Tell us what your school needs.</h1><p className="lede">Share your likely student numbers and year groups. We will reply directly about the available IGCSE Mathematics course access.</p></div>
          <EnquiryForm kind="school" curriculum="IGCSE Mathematics" />
        </div>
      </Container>
    </section>
  );
}
