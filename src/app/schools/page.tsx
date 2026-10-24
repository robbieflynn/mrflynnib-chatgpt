import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "IB Mathematics for schools",
  description: "Classes, assignments, test making, progress analysis and complete IB Mathematics course access for schools.",
};

export default function SchoolsPage() {
  return (
    <>
      <section className="schools-hero schools-hero-simple">
        <Container className="schools-hero-shell">
          <Breadcrumbs items={[{ label: "Schools" }]} />
          <div className="schools-hero-centred stack-lg">
            <Eyebrow>For IB Mathematics departments</Eyebrow>
            <h1>Better tools for teachers. Clearer support for students.</h1>
            <p className="lede">Create classes, set assignments, review student progress, build assessments and give students access to complete IB Mathematics courses.</p>
            <div className="cluster">
              <ButtonLink href="/account?next=/teacher&mode=sign-up">Create a free teacher account</ButtonLink>
              <ButtonLink href="#school-enquiry" secondary>Ask about school access</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <section className="section school-access-section" id="school-options">
        <Container className="split">
          <div className="stack-lg">
            <Eyebrow>Teacher tools</Eyebrow>
            <h2>Everything you need to set work and see how students are doing.</h2>
            <p className="lede">Teachers can start with a free account. If your school also wants complete course access for students, ask us about a school setup.</p>
          </div>
          <div className="school-simple-list">
            <ul className="check-list">
              <li>Create classes and invite students</li>
              <li>Set question-bank assignments</li>
              <li>Review student work and class progress</li>
              <li>Build printable tests and mark schemes</li>
              <li>Download question-level analysis</li>
            </ul>
          </div>
        </Container>
      </section>

      <section id="school-enquiry" className="section school-enquiry-section">
        <Container className="split">
          <div className="stack-lg"><Eyebrow>School enquiries</Eyebrow><h2>Tell us what your department needs.</h2><p className="lede">Share your courses and likely student numbers. We will recommend a practical setup and confirm any course-access quotation before you commit.</p></div>
          <EnquiryForm kind="school" />
        </Container>
      </section>
    </>
  );
}
