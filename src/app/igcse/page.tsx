import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "IGCSE Mathematics",
  description: "Clear Edexcel IGCSE Mathematics support from Mr Flynn IB, including the course, question bank development, schools and tutoring.",
};

const routes = [
  { number: "01", label: "Learn the course", title: "Online course", body: "Lessons for every Edexcel IGCSE Mathematics topic, with clear past-paper solutions.", href: "/igcse/courses", cta: "Explore the course" },
  { number: "02", label: "Practise by topic", title: "Question bank", body: "A dedicated IGCSE Mathematics question bank is being developed for focused practice.", href: "/igcse/question-bank", cta: "See what is coming" },
  { number: "03", label: "For departments", title: "Schools", body: "Ask about IGCSE Mathematics course access and support for your students.", href: "/igcse/schools", cta: "View school support" },
  { number: "04", label: "Personal support", title: "Tutoring", body: "Contact Mr Flynn IB directly to discuss IGCSE Mathematics tutoring and availability.", href: "/igcse/tutoring", cta: "Ask about tutoring" },
] as const;

export default function IgcsePage() {
  return (
    <>
      <section className="igcse-hero">
        <div className="igcse-hero-symbol igcse-hero-symbol-one" aria-hidden="true">𝑥²</div>
        <div className="igcse-hero-symbol igcse-hero-symbol-two" aria-hidden="true">π</div>
        <Container className="igcse-hero-grid">
          <div className="stack-lg">
            <Breadcrumbs items={[{ label: "IGCSE Mathematics" }]} />
            <div className="stack">
              <Eyebrow>IGCSE Mathematics</Eyebrow>
              <h1>Making sense of IGCSE Mathematics.</h1>
              <p className="lede">Clear Edexcel IGCSE Mathematics support from Mr Flynn IB, with complete topic lessons, past-paper solutions and focused practice.</p>
            </div>
            <div className="cluster igcse-hero-actions">
              <ButtonLink href="#igcse-routes">Explore IGCSE Mathematics</ButtonLink>
              <ButtonLink href="#igcse-checklist" secondary>Get the free Edexcel IGCSE checklist</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <section className="igcse-route-section" id="igcse-routes">
        <Container className="stack-xl">
          <div className="igcse-route-heading stack"><Eyebrow>Choose where to start</Eyebrow><h2>What do you need today?</h2></div>
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

      <section className="igcse-checklist-section" id="igcse-checklist">
        <Container>
          <div className="igcse-checklist-card">
            <div className="stack">
              <Eyebrow>Free syllabus checklist</Eyebrow>
              <h2>Get your free Edexcel IGCSE Mathematics checklist.</h2>
              <p>Keep track of every topic and see clearly what you have covered, what needs reviewing and what still needs to be learned.</p>
            </div>
            <div className="igcse-checklist-action stack">
              <a className="button" href="mailto:contact@mrflynnib.com?subject=Free%20Edexcel%20IGCSE%20Mathematics%20checklist">Get the free Edexcel IGCSE checklist</a>
              <small>The checklist will be sent to you by email.</small>
            </div>
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
