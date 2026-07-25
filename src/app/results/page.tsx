import type { Metadata } from "next";
import { Container, Eyebrow, PageHero, PlaceholderNote } from "@/components/ui";

export const metadata: Metadata = { title: "Student results and testimonials", description: "Student and school outcomes from Mr Flynn IB courses, tutoring and resources." };

export default function ResultsPage() {
  return <>
    <PageHero eyebrow="Results" title="Evidence, not empty superlatives." intro="This page is designed for specific, permission-cleared student, parent and school outcomes. It intentionally avoids fabricated testimonials." />
    <section className="section-tight"><Container className="stack-xl"><div className="grid-3">{["Course student", "Tutoring family", "School department"].map((type) => <article className="card stack-lg" key={type}><span className="badge">{type}</span><p className="quote">“Add a genuine quotation that explains the starting problem, what changed and the outcome.”</p><p className="small muted">Name or approved attribution · Course · Exam session</p></article>)}</div><PlaceholderNote>Collect 6–10 testimonials with written permission. Prioritise specific stories and representative experiences; do not imply guaranteed grades. Add anonymisation only where genuinely necessary.</PlaceholderNote></Container></section>
    <section className="section surface-soft"><Container className="stack-xl"><div className="stack"><Eyebrow>Recommended evidence format</Eyebrow><h2>Make every result understandable.</h2></div><div className="grid-3"><article className="card stack"><h3>Starting point</h3><p className="muted">What was difficult before the student used the resource?</p></article><article className="card stack"><h3>Intervention</h3><p className="muted">Which course, tutoring plan or school licence did they use?</p></article><article className="card stack"><h3>Outcome</h3><p className="muted">What changed in understanding, confidence, independence or grade?</p></article></div></Container></section>
  </>;
}
