import type { Metadata } from "next";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "IGCSE Mathematics question bank", description: "The dedicated IGCSE Mathematics question bank from Mr Flynn IB." };

export default function IgcseQuestionBankPage() {
  return (
    <section className="igcse-coming-page"><Container className="igcse-coming-card"><div className="stack-lg"><Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Question bank" }]} /><Eyebrow>Question bank</Eyebrow><h1>Focused IGCSE Mathematics practice is on the way.</h1><p className="lede">The question bank will sit here once the question sets and final course structure are ready. It will be built as part of this IGCSE area, not as a separate website.</p><div className="cluster"><ButtonLink href="/igcse/courses">Explore the course</ButtonLink><ButtonLink href="/igcse" secondary>Back to IGCSE</ButtonLink></div></div><div className="igcse-coming-visual" aria-hidden="true"><span>Topic</span><span>Difficulty</span><span>Question</span><span>Solution</span></div></Container></section>
  );
}
