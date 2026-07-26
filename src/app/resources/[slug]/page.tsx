import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";
import { resources } from "@/lib/content";

const articleCopy: Record<string, { sections: { heading: string; body: string }[] }> = {
  "choosing-aa-or-ai": { sections: [
    { heading: "Start with the style of mathematics", body: "Analysis & Approaches places more emphasis on algebraic reasoning, functions and calculus. Applications & Interpretation places more emphasis on modelling, statistics, technology and interpreting results in context." },
    { heading: "Then check university requirements", body: "The right choice depends partly on likely degree subjects and specific university entry requirements. Students should check current requirements directly rather than relying on broad assumptions." },
    { heading: "Choose the level you can sustain", body: "A more demanding course is not automatically the better choice. The strongest decision balances future options, genuine mathematical readiness, workload and the grades the student can realistically achieve." },
  ]},
  "ib-maths-revision-plan": { sections: [
    { heading: "Weeks 1–2: diagnose and rebuild", body: "Use topic checklists and short question sets to identify the exact skills that are missing. Relearn those ideas before attempting full papers." },
    { heading: "Weeks 3–4: connect topics", body: "Move into mixed and extended questions. Practise deciding which method to use instead of waiting for the topic label to tell you." },
    { heading: "Weeks 5–6: perform under exam conditions", body: "Complete timed sections and full papers, then analyse errors by cause: knowledge, method selection, calculator use, notation, interpretation or time management." },
  ]},
  "what-examiners-look-for": { sections: [
    { heading: "Method must be visible", body: "A correct final answer is valuable, but many questions award marks for a valid process. Show enough mathematical working for the examiner to follow the reasoning." },
    { heading: "Use notation that communicates", body: "Notation is not decoration. Define variables, use equality signs accurately and state conclusions in context when the question requires interpretation." },
    { heading: "Answer the command term", body: "Calculate, show, hence, interpret and justify are different instructions. Strong exam technique begins by responding to the exact task rather than merely producing related mathematics." },
  ]},
};

export function generateStaticParams() { return resources.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const resource = resources.find((item) => item.slug === slug); return resource ? { title: resource.title, description: resource.summary } : {}; }

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = resources.find((item) => item.slug === slug);
  if (!resource) notFound();
  const article = articleCopy[slug];
  return <article><section className="page-hero"><Container className="narrow stack-lg"><div className="cluster"><span className="badge">{resource.audience}</span><span className="small muted">{resource.readTime}</span></div><h1>{resource.title}</h1><p className="lede">{resource.summary}</p></Container></section><section className="section-tight"><Container className="narrow stack-xl">{article.sections.map((section) => <section className="stack" key={section.heading}><h2 style={{ fontSize: "clamp(1.8rem,4vw,2.7rem)" }}>{section.heading}</h2><p className="lede">{section.body}</p></section>)}<div className="card stack-lg"><Eyebrow>Need a structured next step?</Eyebrow><h2>See the course built for your pathway.</h2><ButtonLink href="/courses">Explore courses</ButtonLink></div></Container></section></article>;
}
