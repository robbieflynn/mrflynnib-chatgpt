import type { Metadata } from "next";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "Edexcel IGCSE Mathematics course", description: "Lessons for every Edexcel IGCSE Mathematics topic and clear past-paper solutions from Mr Flynn IB." };

export default function IgcseCoursesPage() {
  return (
    <>
      <section className="igcse-page-hero"><Container className="igcse-page-hero-grid"><div className="stack-lg"><Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Courses" }]} /><div className="stack"><Eyebrow>Online course</Eyebrow><h1>Learn Edexcel IGCSE Mathematics with clear, structured support.</h1><p className="lede">Follow lessons for every topic, revisit difficult ideas and learn from clear past-paper solutions.</p></div></div><div className="igcse-page-marker" aria-hidden="true">Course<span>01</span></div></Container></section>
      <section className="igcse-content-section"><Container className="igcse-content-grid"><div className="stack-lg"><Eyebrow>Inside the course</Eyebrow><h2>Complete support across the Edexcel IGCSE course.</h2><p className="lede">Learn each topic in a clear sequence, then see how the same ideas are used in real past-paper questions. Access options, pricing and the final enrolment link will be confirmed before publication.</p><div className="cluster"><ButtonLink href="/contact">Ask about course access</ButtonLink><ButtonLink href="/igcse" secondary>Back to IGCSE</ButtonLink></div></div><aside className="igcse-detail-card stack"><span>Course content</span><strong>Lessons for every topic</strong><p>Clear, structured explanations</p><p>Past-paper solutions</p><p>Support for independent study and revision</p></aside></Container></section>
    </>
  );
}
