import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "IGCSE Mathematics",
  description: "Clear IGCSE Mathematics support from Mr Flynn IB, including the course, question bank development, schools and tutoring.",
};

const routes = [
  { number: "01", label: "Learn the course", title: "Online course", body: "Structured IGCSE Mathematics teaching with clear explanations and worked questions.", href: "/igcse/courses", cta: "Explore the course" },
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
              <p className="lede">A dedicated IGCSE Mathematics area from Mr Flynn IB, bringing the course, question bank, school support and tutoring together in one place.</p>
            </div>
          </div>
          <div className="igcse-hero-panel" aria-label="Choose an IGCSE Mathematics route">
            <Link href="/igcse/courses">Course <i aria-hidden="true">→</i></Link>
            <Link href="/igcse/question-bank">Question bank <i aria-hidden="true">→</i></Link>
            <Link href="/igcse/schools">Schools <i aria-hidden="true">→</i></Link>
            <Link href="/igcse/tutoring">Tutoring <i aria-hidden="true">→</i></Link>
          </div>
        </Container>
      </section>

      <section className="igcse-route-section">
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

      <section className="igcse-principles">
        <Container className="igcse-principles-grid">
          <div className="stack"><Eyebrow>The same teaching approach</Eyebrow><h2>Mathematics made easier to follow.</h2></div>
          <div className="igcse-principle-list"><p><strong>Clear explanations</strong><span>Ideas broken into manageable steps.</span></p><p><strong>Worked questions</strong><span>See how the mathematics is applied.</span></p><p><strong>Independent support</strong><span>Revisit difficult topics at your own pace.</span></p></div>
        </Container>
      </section>
    </>
  );
}
