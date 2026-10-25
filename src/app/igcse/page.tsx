import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";

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
      <section className="igcse-landing-hero">
        <svg className="igcse-landing-graph" viewBox="0 0 920 480" fill="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="igcse-graph-fade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="white" stopOpacity="0.02" />
              <stop offset="0.44" stopColor="white" stopOpacity="0.54" />
              <stop offset="1" stopColor="white" stopOpacity="1" />
            </linearGradient>
            <mask id="igcse-graph-mask">
              <rect width="920" height="480" fill="url(#igcse-graph-fade)" />
            </mask>
          </defs>
          <g mask="url(#igcse-graph-mask)" stroke="currentColor">
            <path d="M0 80H920M0 160H920M0 240H920M0 320H920M0 400H920M80 0V480M160 0V480M240 0V480M320 0V480M400 0V480M480 0V480M560 0V480M640 0V480M720 0V480M800 0V480M880 0V480" strokeOpacity=".06" />
            <path d="M0 400H920M240 0V480" strokeWidth="1.4" strokeOpacity=".14" />
            <path d="M24 418C144 412 226 382 300 318C382 247 433 130 526 126C637 121 696 284 896 44" strokeWidth="2.4" strokeOpacity=".28" />
            <path d="M102 334C184 238 266 238 348 334C430 430 512 430 594 334C676 238 758 238 840 334" strokeWidth="1.5" strokeOpacity=".12" />
          </g>
          <g className="igcse-landing-points"><circle cx="300" cy="318" r="5" /><circle cx="526" cy="126" r="5" /><circle cx="722" cy="248" r="5" /></g>
        </svg>
        <Container className="igcse-landing-hero-inner">
          <Breadcrumbs items={[{ label: "IGCSE Mathematics" }]} />
          <div className="igcse-landing-copy stack-lg">
            <div className="stack">
              <Eyebrow>Edexcel IGCSE Mathematics</Eyebrow>
              <h1>Your home for IGCSE Mathematics.</h1>
              <p className="lede">Complete video lessons, past-paper solutions and focused question practice, explained clearly by Mr Flynn IB.</p>
            </div>
            <div className="cluster igcse-landing-actions">
              <ButtonLink href="/account?qualification=igcse&mode=sign-up">Start here</ButtonLink>
              <ButtonLink href="/account?qualification=igcse" secondary>Log in</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <section className="igcse-route-section igcse-route-section-first">
        <Container className="stack-xl">
          <div className="igcse-route-intro stack">
            <Eyebrow>Explore IGCSE Mathematics</Eyebrow>
            <h2>What would you like to do?</h2>
          </div>
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
