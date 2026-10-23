import type { Metadata } from "next";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";
import { getCourseProduct } from "@/lib/platform-products";

export const metadata: Metadata = { title: "Edexcel IGCSE Mathematics course", description: "Lessons for every Edexcel IGCSE Mathematics topic and clear past-paper solutions from Mr Flynn IB." };

export default function IgcseCoursesPage() {
  const product = getCourseProduct("igcse")!;
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
          <div className="stack"><Eyebrow>Course access</Eyebrow><h2>Choose 12 or 24 months.</h2><p>Both options unlock the complete IGCSE Mathematics course.</p></div>
          <ul className="access-plan-list">{product.plans.map((plan) => <li className={plan.badge ? "access-plan-recommended" : ""} key={plan.id}><div><strong>{plan.label}</strong>{plan.badge ? <span>{plan.badge}</span> : null}<small>Complete course access. One payment.</small></div><b>US${plan.priceUsd}</b></li>)}</ul>
          <ButtonLink href="/igcse/account/access?course=igcse">Try lessons and choose access</ButtonLink>
          <ButtonLink href="/go/igcse-course" secondary>Already enrolled on Teachable?</ButtonLink>
          <small>No automatic renewal.</small>
        </aside>
      </Container>
    </section>
  );
}
