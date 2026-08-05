import type { Metadata } from "next";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "IGCSE Mathematics course", description: "Explore the IGCSE Mathematics course from Mr Flynn IB." };

export default function IgcseCoursesPage() {
  return (
    <>
      <section className="igcse-page-hero"><Container className="igcse-page-hero-grid"><div className="stack-lg"><Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Courses" }]} /><div className="stack"><Eyebrow>Online course</Eyebrow><h1>Learn IGCSE Mathematics with clear, structured support.</h1><p className="lede">Work through the course topic by topic, revisit difficult ideas and use worked questions to build confidence.</p></div></div><div className="igcse-page-marker" aria-hidden="true">Course<span>01</span></div></Container></section>
      <section className="igcse-content-section"><Container className="igcse-content-grid"><div className="stack-lg"><Eyebrow>Course access</Eyebrow><h2>Your IGCSE Mathematics course.</h2><p className="lede">The final exam-board, syllabus and access details will be added here before this section is published. This preview keeps those choices open rather than giving students the wrong information.</p><div className="cluster"><ButtonLink href="/contact">Ask about course access</ButtonLink><ButtonLink href="/igcse" secondary>Back to IGCSE</ButtonLink></div></div><aside className="igcse-detail-card stack"><span>Details to confirm</span><strong>Exam board and syllabus</strong><p>Course pathway and tier</p><p>Access options and pricing</p><p>Final enrolment link</p></aside></Container></section>
    </>
  );
}
