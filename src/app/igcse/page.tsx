import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "IGCSE Mathematics",
  description: "Clear Edexcel IGCSE Mathematics support from Mr Flynn IB, including the course, question bank development, schools and tutoring.",
};

const routes = [
  { number: "01", label: "Learn the course", title: "Online course", body: "Lessons for every Edexcel IGCSE Mathematics topic, with clear past-paper solutions.", href: "/igcse/courses", cta: "Explore the course" },
  { number: "02", label: "Practise by topic", title: "Question bank", body: "Focused Edexcel IGCSE Mathematics questions with filters and complete mark schemes.", href: "/igcse/question-bank", cta: "Open the question bank" },
  { number: "03", label: "For departments", title: "Schools", body: "Ask about IGCSE Mathematics course access and support for your students.", href: "/igcse/schools", cta: "View school support" },
  { number: "04", label: "Personal support", title: "Tutoring", body: "Contact Mr Flynn IB directly to discuss IGCSE Mathematics tutoring and availability.", href: "/igcse/tutoring", cta: "Ask about tutoring" },
] as const;

export default function IgcsePage() {
  return (
    <>
      <section className="igcse-route-section igcse-route-section-first">
        <Container className="stack-xl">
          <Breadcrumbs items={[{ label: "IGCSE Mathematics" }]} />
          <div className="igcse-route-heading stack"><Eyebrow>Edexcel IGCSE Mathematics</Eyebrow><h1>What do you need today?</h1></div>
          <div className="igcse-route-grid">
            {routes.map((route) => (
              <Link className="igcse-route-card" href={route.href} key={route.title}>
                <div className="igcse-route-card-top"><span>{route.number}</span><small>{route.label}</small></div>
                <div className="stack"><h3>{route.title}</h3><p>{route.body}</p></div>
                <strong>{route.cta}<i aria-hidden="true">→</i></strong>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="igcse-principles">
        <Container className="igcse-principles-grid">
          <div className="stack"><Eyebrow>The same teaching approach</Eyebrow><h2>Mathematics made easier to follow.</h2></div>
          <div className="igcse-principle-list"><p><strong>Clear explanations</strong><span>Ideas broken into manageable steps.</span></p><p><strong>Lessons for every topic</strong><span>Work through the complete Edexcel IGCSE Mathematics course.</span></p><p><strong>Past-paper solutions</strong><span>See complete questions worked through clearly.</span></p></div>
        </Container>
      </section>
    </>
  );
}
