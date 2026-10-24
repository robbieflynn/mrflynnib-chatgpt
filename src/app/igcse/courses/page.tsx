import type { Metadata } from "next";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "Edexcel IGCSE Mathematics course", description: "Lessons for every Edexcel IGCSE Mathematics topic and clear past-paper solutions from Mr Flynn IB." };

export default function IgcseCoursesPage() {
  return (
    <section className="igcse-page-hero igcse-course-page">
      <Container className="igcse-page-hero-grid">
        <div className="stack-xl">
          <Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Online course" }]} />
          <div className="stack-lg">
          <Eyebrow>Online course</Eyebrow>
          <h1>Lessons on every topic and past-paper solutions.</h1>
          <p className="lede">Learn Edexcel IGCSE Mathematics through clear topic lessons, then see the same ideas applied in complete past-paper solutions.</p>
          </div>
        </div>
        <aside className="course-purchase-card">
          <div className="stack"><Eyebrow>Course access</Eyebrow><h2>Continue with the complete IGCSE course.</h2><p>Existing students can keep learning on Teachable while the new native IGCSE course experience is prepared.</p></div>
          <ButtonLink href="/go/igcse-course">Open the IGCSE course</ButtonLink>
          <ButtonLink href="/igcse/account?mode=sign-up" secondary>Create a free IGCSE account</ButtonLink>
        </aside>
      </Container>
    </section>
  );
}
